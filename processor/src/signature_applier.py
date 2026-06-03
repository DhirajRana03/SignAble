"""Apply signatures and audit certificate to a PDF.

Stamps signature images / typed text onto pages at percentage coordinates,
then appends a final audit certificate page.
"""

from __future__ import annotations

import base64
import io

from pydantic import BaseModel
from pypdf import PdfReader, PdfWriter
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


class SignedFieldData(BaseModel):
    """One signed field's data sent from Node.js backend."""

    field_type: str  # "signature" | "initials" | "date" | "text"
    page_number: int
    x_pct: float
    y_pct: float
    width_pct: float
    height_pct: float
    value: str  # base64 image for sig/initials, plain text for date/text


class SignatureApplier:
    """Merge signature overlays onto original PDF + append audit page."""

    def apply(
        self,
        original_pdf: bytes,
        fields: list[SignedFieldData],
        page_dims: list[tuple[float, float]],
    ) -> bytes:
        reader = PdfReader(io.BytesIO(original_pdf))
        writer = PdfWriter()
        by_page: dict[int, list[SignedFieldData]] = {}
        for f in fields:
            by_page.setdefault(f.page_number, []).append(f)

        for idx, page in enumerate(reader.pages, 1):
            if idx in by_page:
                w, h = page_dims[idx - 1]
                overlay_buf = self._make_overlay(w, h, by_page[idx])
                overlay_page = PdfReader(overlay_buf).pages[0]
                page.merge_page(overlay_page)
            writer.add_page(page)

        writer.add_page(self._make_audit_page(fields))

        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()

    def _make_overlay(
        self, w: float, h: float, fields: list[SignedFieldData]
    ) -> io.BytesIO:
        buf = io.BytesIO()
        c = rl_canvas.Canvas(buf, pagesize=(w, h))
        for f in fields:
            px = f.x_pct * w
            # Convert top-down HTML coordinates → bottom-up PDF coordinates
            py = (1.0 - f.y_pct - f.height_pct) * h
            pw = f.width_pct * w
            ph = f.height_pct * h
            if f.field_type in ("signature", "initials") and f.value:
                raw = f.value.split(",")[-1]  # strip data URI prefix
                img_bytes = base64.b64decode(raw)
                c.drawImage(
                    ImageReader(io.BytesIO(img_bytes)),
                    px,
                    py,
                    pw,
                    ph,
                    mask="auto",
                )
            elif f.field_type in ("date", "text") and f.value:
                c.setFont("Helvetica", min(ph * 0.6, 12))
                c.drawString(px + 4, py + ph * 0.25, f.value)
        c.save()
        buf.seek(0)
        return buf

    def _make_audit_page(self, fields: list[SignedFieldData]):
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4)
        styles = getSampleStyleSheet()
        story = [
            Paragraph("Certificate of Completion — SinAble", styles["Heading1"]),
            Spacer(1, 12),
            Paragraph(f"Total fields signed: {len(fields)}", styles["Normal"]),
            Spacer(1, 6),
        ]
        for i, f in enumerate(fields, 1):
            story.append(
                Paragraph(
                    f"{i}. Field type: {f.field_type} | Page: {f.page_number}",
                    styles["Normal"],
                )
            )
        doc.build(story)
        buf.seek(0)
        return PdfReader(buf).pages[0]


signature_applier = SignatureApplier()
