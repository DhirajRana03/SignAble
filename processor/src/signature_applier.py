"""Apply signatures and audit certificate to a PDF.

Stamps signature images / typed text onto pages at percentage coordinates,
then appends a final audit certificate page.
"""

from __future__ import annotations

import base64
import io

from pydantic import BaseModel
from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import (
    Image as RLImage,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


# DocuSign-style indigo for the signature bracket frame. Picked to read
# clearly on white paper while staying within brand palette.
SIG_BRACKET_COLOR = HexColor("#3B2DCB")
SIG_BRACKET_WIDTH = 1.4  # stroke thickness, points
SIG_LABEL_COLOR = Color(0, 0, 0)


class SignedFieldData(BaseModel):
    """One signed field's data sent from Node.js backend."""

    field_type: str  # "signature" | "initials" | "date" | "text"
    page_number: int
    x_pct: float
    y_pct: float
    width_pct: float
    height_pct: float
    value: str  # base64 image for sig/initials, plain text for date/text
    # DocuSign-style metadata. Optional so older callers still work.
    label: str | None = None  # "Signed by:" / "Initial"
    signer_name: str | None = None  # display name beside the bracket
    hash_id: str | None = None  # short recipient hash shown under signature


class RecipientCertEntry(BaseModel):
    """One recipient row on the Certificate of Completion."""

    name: str
    email: str
    signing_id: str  # short hex hash printed under "ID:"
    security_level: str = "Email, Account Authentication (None)"
    sent_at: str | None = None
    viewed_at: str | None = None
    signed_at: str | None = None
    ip_address: str | None = None
    signature_image: str | None = None  # base64 data URL of adopted signature
    adoption_method: str = "Pre-selected Style"
    disclosure_accepted_at: str | None = None


class CertificateData(BaseModel):
    """Full audit data for the Certificate of Completion page set.

    Mirrors the DocuSign certificate layout: envelope identity, source
    metadata, signer events with adopted signatures, and grouped event
    summaries.
    """

    envelope_id: str  # uppercase hyphenated UUID
    subject: str  # `Complete with SignAble: <title>`
    status: str = "Completed"
    document_pages: int = 0
    certificate_pages: int = 0  # filled by builder once page count known
    signatures_count: int = 0
    initials_count: int = 0
    autonav: str = "Enabled"
    envelope_id_stamping: str = "Enabled"
    time_zone: str = "(UTC) Coordinated Universal Time"
    envelope_originator_name: str = ""
    envelope_originator_email: str = ""
    envelope_originator_ip: str = ""
    record_holder_name: str = ""
    record_holder_email: str = ""
    record_status_timestamp: str | None = None
    location: str = "SignAble"
    recipients: list[RecipientCertEntry] = []
    envelope_sent_at: str | None = None
    envelope_completed_at: str | None = None


class SignatureApplier:
    """Merge signature overlays onto original PDF + append audit page."""

    def apply(
        self,
        original_pdf: bytes,
        fields: list[SignedFieldData],
        page_dims: list[tuple[float, float]],
        certificate: CertificateData | None = None,
        include_certificate: bool = False,
    ) -> bytes:
        """Stamp signatures onto the original PDF.

        Certificate is only appended when `include_certificate=True`.
        Default keeps signed document and certificate decoupled so
        callers can persist + serve them independently.
        """
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

        if include_certificate:
            cert = certificate or self._fallback_certificate(fields)
            for cert_page in self._make_certificate_pages(cert, fields):
                writer.add_page(cert_page)

        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()

    def build_certificate(
        self,
        certificate: CertificateData,
        fields: list[SignedFieldData],
    ) -> bytes:
        """Render Certificate of Completion as a standalone PDF."""
        writer = PdfWriter()
        for page in self._make_certificate_pages(certificate, fields):
            writer.add_page(page)
        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()

    @staticmethod
    def merge_pdfs(pdfs: list[bytes]) -> bytes:
        """Concatenate PDFs in order. Skips empty/invalid entries."""
        writer = PdfWriter()
        for raw in pdfs:
            if not raw:
                continue
            for page in PdfReader(io.BytesIO(raw)).pages:
                writer.add_page(page)
        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()

    def _make_overlay(
        self, w: float, h: float, fields: list[SignedFieldData]
    ) -> io.BytesIO:
        buf = io.BytesIO()
        c = rl_canvas.Canvas(buf, pagesize=(w, h))
        deduped = self._dedupe_overlapping(fields)
        for f in deduped:
            px = f.x_pct * w
            # Top-down HTML → bottom-up PDF.
            py = (1.0 - f.y_pct - f.height_pct) * h
            pw = f.width_pct * w
            ph = f.height_pct * h
            if f.field_type == "signature" and f.value:
                self._draw_signature_block(c, f, px, py, pw, ph)
            elif f.field_type == "initials" and f.value:
                self._draw_initials_block(c, f, px, py, pw, ph)
            elif f.field_type in ("date", "text") and f.value:
                c.setFont("Helvetica", min(ph * 0.6, 12))
                c.drawString(px + 4, py + ph * 0.25, f.value)
        c.save()
        buf.seek(0)
        return buf

    @staticmethod
    def _dedupe_overlapping(
        fields: list[SignedFieldData],
    ) -> list[SignedFieldData]:
        """Drop overlapping same-type stamps.

        Any same-type signature/initials whose bounding box overlaps
        another by >5% of either area collapses to the largest. Tight
        threshold catches near-coincident drops + slight nudges; bigger
        intentional placements (separate signers, separate spots) clear
        easily because their overlap is well under 5%.
        """
        sig_like = [f for f in fields if f.field_type in ("signature", "initials")]
        others = [f for f in fields if f.field_type not in ("signature", "initials")]
        # Largest first so smaller duplicates lose. Stable enough since
        # area is a strict-ish ordering.
        sig_like.sort(key=lambda f: f.width_pct * f.height_pct, reverse=True)

        kept: list[SignedFieldData] = []
        for f in sig_like:
            f_area = max(f.width_pct * f.height_pct, 1e-9)
            collision = False
            for k in kept:
                if k.field_type != f.field_type:
                    continue
                ix = max(
                    0.0,
                    min(f.x_pct + f.width_pct, k.x_pct + k.width_pct)
                    - max(f.x_pct, k.x_pct),
                )
                iy = max(
                    0.0,
                    min(f.y_pct + f.height_pct, k.y_pct + k.height_pct)
                    - max(f.y_pct, k.y_pct),
                )
                inter = ix * iy
                if inter <= 0:
                    continue
                k_area = max(k.width_pct * k.height_pct, 1e-9)
                if inter / f_area > 0.05 or inter / k_area > 0.05:
                    collision = True
                    break
            if not collision:
                kept.append(f)
        return kept + others

    def _draw_signature_block(
        self,
        c: rl_canvas.Canvas,
        f: SignedFieldData,
        px: float,
        py: float,
        pw: float,
        ph: float,
    ) -> None:
        """DocuSign-style signature stamp.

        Layout (left-only bracket, label/hash outside bracket interior):

            [── Signed by:
            │
            │   <signature image>
            │
            [── 17941BF901958D0…

        Bracket rail lives on left edge. Top foot extends right; label
        sits flush above the foot, aligned with bracket interior. Bottom
        foot extends right; hash sits flush below the foot. Image fills
        the interior between feet.
        """
        label = f.label or "Signed by:"
        hash_id = (f.hash_id or "")[:16]

        self._draw_left_bracket(c, px, py, pw, ph)
        foot = min(pw * 0.14, 12.0)
        text_x = px + foot + 4

        # Three rigid rows. Signature image dominates ~76% of field
        # height. Label + hash rows tight; font caps below clamp
        # absolute label/hash size so they never dwarf the signature
        # — that's the bug in the v12 render where label/hash read
        # 22pt while a short script name like "Fake User" rendered
        # at ~10pt due to preserveAspectRatio shrinking the image
        # vertically to fit the row.
        label_h_frac = 0.14 if hash_id else 0.18
        hash_h_frac = 0.10 if hash_id else 0.0
        img_h_frac = 1.0 - label_h_frac - hash_h_frac

        label_h = ph * label_h_frac
        hash_h = ph * hash_h_frac
        img_h = ph * img_h_frac

        # y-coords (bottom-up).
        img_bottom = py + hash_h
        label_bottom = py + ph - label_h

        # Label — top row. Cap pulled down so label cannot dominate the
        # signature image visually. Empirical: 11pt reads comfortably
        # next to a tall script glyph.
        label_size = max(min(label_h * 0.78, 11), 7)
        c.setFillColor(SIG_LABEL_COLOR)
        c.setFont("Helvetica-Bold", label_size)
        c.drawString(text_x, label_bottom + label_h * 0.25, label)

        # Signature image — middle row. Aspect preserved so the script
        # glyph keeps its natural proportions; v14 stretched it into a
        # fattened pseudo-bold. Tight crop on the frontend canvas means
        # the proportional fit still reads at a reasonable size.
        img_w = max(pw - foot - 6, 1)
        raw = f.value.split(",")[-1]
        img_bytes = base64.b64decode(raw)
        img = ImageReader(io.BytesIO(img_bytes))
        if img_h > 0 and img_w > 0:
            c.drawImage(
                img,
                text_x,
                img_bottom,
                img_w,
                img_h,
                mask="auto",
                preserveAspectRatio=True,
                anchor="sw",
            )

        # Hash — bottom row. Single draw call. Cap matched to label so
        # the two metadata lines balance and stay subordinate to the
        # signature image.
        if hash_id and hash_h > 0:
            hash_size = max(min(hash_h * 0.78, 9), 6)
            c.setFillColor(SIG_LABEL_COLOR)
            c.setFont("Helvetica-Bold", hash_size)
            c.drawString(text_x, py + hash_h * 0.25, f"{hash_id}\u2026")

    def _draw_initials_block(
        self,
        c: rl_canvas.Canvas,
        f: SignedFieldData,
        px: float,
        py: float,
        pw: float,
        ph: float,
    ) -> None:
        """DocuSign-style initials: left bracket + 'Initial' label above
        top foot + initials image filling interior."""
        label = f.label or "Initial"
        # Tight label row so the initials image dominates ~80% of
        # field height. Font cap keeps "Initial" subordinate.
        label_h = max(min(ph * 0.18, 11.0), 7.0)

        self._draw_left_bracket(c, px, py, pw, ph)

        foot = min(pw * 0.2, 11.0)
        text_x = px + foot + 4
        c.setFillColor(SIG_LABEL_COLOR)
        label_size = max(min(label_h * 0.78, 10), 6)
        c.setFont("Helvetica-Bold", label_size)
        label_baseline = py + ph - label_h * 0.85
        c.drawString(text_x, label_baseline, label)

        img_top = py + ph - label_h
        img_bottom = py + 2
        img_h = max(img_top - img_bottom, ph * 0.55)
        img_w = pw - foot - 6
        raw = f.value.split(",")[-1]
        img_bytes = base64.b64decode(raw)
        img = ImageReader(io.BytesIO(img_bytes))
        c.drawImage(
            img,
            text_x,
            img_bottom,
            img_w,
            img_h,
            mask="auto",
            preserveAspectRatio=True,
            anchor="sw",
        )

    def _draw_left_bracket(
        self,
        c: rl_canvas.Canvas,
        px: float,
        py: float,
        pw: float,
        ph: float,
    ) -> None:
        """Stroke DocuSign-style left bracket with rounded corners.

        Single continuous path: top foot → quarter-arc → left rail →
        quarter-arc → bottom foot. Corner radius scales with bracket
        size, capped so very tall brackets stay visually consistent.
        """
        foot = min(pw * 0.14, 12.0)
        # Corner radius: enough to read as rounded, capped so the
        # straight segments dominate the silhouette.
        r = min(foot * 0.85, ph * 0.18, 6.0)
        r = max(r, 1.5)

        c.saveState()
        c.setStrokeColor(SIG_BRACKET_COLOR)
        c.setLineWidth(SIG_BRACKET_WIDTH)
        c.setLineCap(1)
        c.setLineJoin(1)

        path = c.beginPath()
        # Top foot: right tip → corner start.
        path.moveTo(px + foot, py + ph)
        path.lineTo(px + r, py + ph)
        # Top-left rounded corner.
        path.arcTo(px, py + ph - 2 * r, px + 2 * r, py + ph, 90, 90)
        # Left rail.
        path.lineTo(px, py + r)
        # Bottom-left rounded corner.
        path.arcTo(px, py, px + 2 * r, py + 2 * r, 180, 90)
        # Bottom foot: corner end → right tip.
        path.lineTo(px + foot, py)
        c.drawPath(path, stroke=1, fill=0)

        c.restoreState()

    # ---------- Certificate of Completion ----------------------------

    # DocuSign-style band header background.
    _BAND_BG = HexColor("#D9D9D9")
    _BAND_TEXT = colors.black

    def _make_certificate_pages(
        self,
        cert: CertificateData,
        fields: list[SignedFieldData],
    ):
        """Render multi-page Certificate of Completion. Returns list of
        pypdf pages ready to append to the writer."""
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=0.5 * inch,
            rightMargin=0.5 * inch,
            topMargin=0.6 * inch,
            bottomMargin=0.6 * inch,
        )

        styles = getSampleStyleSheet()
        body = ParagraphStyle(
            "cert_body",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
        )
        body_bold = ParagraphStyle(
            "cert_body_bold",
            parent=body,
            fontName="Helvetica-Bold",
        )
        small = ParagraphStyle(
            "cert_small",
            parent=body,
            fontSize=7.5,
            textColor=colors.HexColor("#333333"),
        )

        story: list = []

        # --- Brand banner ---
        brand_title = ParagraphStyle(
            "brand_title",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=20,
            textColor=HexColor("#3B2DCB"),
            leading=22,
        )
        brand_tagline = ParagraphStyle(
            "brand_tagline",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            textColor=colors.HexColor("#6B7280"),
            leading=11,
            spaceAfter=8,
        )
        story.append(Paragraph("SignAble", brand_title))
        story.append(
            Paragraph(
                "Electronic Signature Platform &nbsp;&middot;&nbsp; "
                "Signed and verified records",
                brand_tagline,
            )
        )

        # --- Header band: Certificate Of Completion ---
        story.append(self._band_header("Certificate Of Completion"))

        # --- Envelope identity 3-column ---
        envelope_left = (
            f"<b>Envelope Id:</b> {cert.envelope_id}<br/>"
            f"<b>Subject:</b> {self._escape(cert.subject)}<br/>"
            "<b>Source Envelope:</b><br/>"
            f"<b>Document Pages:</b> {cert.document_pages}<br/>"
            f"<b>Certificate Pages:</b> {cert.certificate_pages or 1}<br/>"
            f"<b>AutoNav:</b> {cert.autonav}<br/>"
            f"<b>EnvelopeId Stamping:</b> {cert.envelope_id_stamping}<br/>"
            f"<b>Time Zone:</b> {cert.time_zone}"
        )
        envelope_mid = (
            f"<b>Signatures:</b> {cert.signatures_count}<br/>"
            f"<b>Initials:</b> {cert.initials_count}"
        )
        envelope_right = (
            f"<b>Status:</b> {cert.status}<br/><br/><br/>"
            "<b>Envelope Originator:</b><br/>"
            f"{self._escape(cert.envelope_originator_name)}<br/>"
            f"{self._escape(cert.envelope_originator_email)}<br/>"
            f"<b>IP Address:</b> {self._escape(cert.envelope_originator_ip)}"
        )
        story.append(
            self._three_col(
                Paragraph(envelope_left, body),
                Paragraph(envelope_mid, body),
                Paragraph(envelope_right, body),
            )
        )

        # --- Record Tracking band ---
        story.append(self._band_header("Record Tracking"))
        record_left = Paragraph(
            f"<b>Status:</b> Original<br/>"
            f"&nbsp;&nbsp;&nbsp;&nbsp;{self._escape(cert.record_status_timestamp or '')}",
            body,
        )
        record_mid = Paragraph(
            f"<b>Holder:</b> {self._escape(cert.record_holder_name)}<br/>"
            f"&nbsp;&nbsp;&nbsp;&nbsp;{self._escape(cert.record_holder_email)}",
            body,
        )
        record_right = Paragraph(
            f"<b>Location:</b> {self._escape(cert.location)}",
            body,
        )
        story.append(self._three_col(record_left, record_mid, record_right))

        # --- Signer Events band ---
        story.append(self._three_col_band("Signer Events", "Signature", "Timestamp"))
        for r in cert.recipients:
            sig_block = self._signer_signature_cell(r, body, small)
            event_block = Paragraph(
                f"{self._escape(r.name)}<br/>"
                f"{self._escape(r.email)}<br/>"
                f"<b>Security Level:</b> {self._escape(r.security_level)}",
                body,
            )
            ts_block = Paragraph(
                f"<b>Sent:</b> {self._escape(r.sent_at or '')}<br/>"
                f"<b>Viewed:</b> {self._escape(r.viewed_at or '')}<br/>"
                f"<b>Signed:</b> {self._escape(r.signed_at or '')}",
                body,
            )
            story.append(self._three_col(event_block, sig_block, ts_block))
            if r.disclosure_accepted_at:
                story.append(Spacer(1, 4))
                story.append(
                    Paragraph(
                        "<b>Electronic Record and Signature Disclosure:</b><br/>"
                        f"&nbsp;&nbsp;&nbsp;&nbsp;Accepted: {self._escape(r.disclosure_accepted_at)}<br/>"
                        f"&nbsp;&nbsp;&nbsp;&nbsp;ID: {self._escape(r.signing_id)}",
                        small,
                    )
                )
            story.append(Spacer(1, 6))

        # --- Empty section bands (mirror DocuSign structure) ---
        empty_sections = [
            ("In Person Signer Events", "Signature", "Timestamp"),
            ("Editor Delivery Events", "Status", "Timestamp"),
            ("Agent Delivery Events", "Status", "Timestamp"),
            ("Intermediary Delivery Events", "Status", "Timestamp"),
            ("Certified Delivery Events", "Status", "Timestamp"),
            ("Carbon Copy Events", "Status", "Timestamp"),
            ("Witness Events", "Signature", "Timestamp"),
            ("Notary Events", "Signature", "Timestamp"),
        ]
        for left, mid, right in empty_sections:
            story.append(self._three_col_band(left, mid, right))
            story.append(Spacer(1, 8))

        # --- Envelope Summary Events ---
        story.append(
            self._three_col_band("Envelope Summary Events", "Status", "Timestamps")
        )
        summary_rows = [
            ("Envelope Sent", "Hashed/Encrypted", cert.envelope_sent_at or ""),
            (
                "Certified Delivered",
                "Security Checked",
                cert.recipients[0].viewed_at if cert.recipients else "",
            ),
            (
                "Signing Complete",
                "Security Checked",
                cert.recipients[-1].signed_at if cert.recipients else "",
            ),
            (
                "Completed",
                "Security Checked",
                cert.envelope_completed_at or "",
            ),
        ]
        summary_left = "<br/>".join(self._escape(r[0]) for r in summary_rows)
        summary_mid = "<br/>".join(self._escape(r[1]) for r in summary_rows)
        summary_right = "<br/>".join(self._escape(r[2]) for r in summary_rows)
        story.append(
            self._three_col(
                Paragraph(summary_left, body),
                Paragraph(summary_mid, body),
                Paragraph(summary_right, body),
            )
        )

        # --- Payment Events placeholder ---
        story.append(self._three_col_band("Payment Events", "Status", "Timestamps"))
        story.append(Spacer(1, 8))

        # --- ERSD trailing band ---
        story.append(self._band_header("Electronic Record and Signature Disclosure"))
        story.append(
            Paragraph(
                "The recipients of this envelope agreed to use electronic "
                "records and signatures via the SignAble platform. Records "
                "and consent are preserved in the audit trail above.",
                body,
            )
        )

        doc.build(story)
        buf.seek(0)
        return list(PdfReader(buf).pages)

    # ---------- table primitives ----------------------------------

    def _band_header(self, text: str) -> Table:
        """Full-width grey band with bold black title — DocuSign section ribbon."""
        tbl = Table(
            [[Paragraph(f"<b>{self._escape(text)}</b>", self._band_style())]],
            colWidths=[None],
        )
        tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), self._BAND_BG),
                    ("TEXTCOLOR", (0, 0), (-1, -1), self._BAND_TEXT),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        return tbl

    def _three_col_band(self, left: str, mid: str, right: str) -> Table:
        """Grey-banded triple-column section header."""
        style = self._band_style()
        tbl = Table(
            [
                [
                    Paragraph(f"<b>{self._escape(left)}</b>", style),
                    Paragraph(f"<b>{self._escape(mid)}</b>", style),
                    Paragraph(f"<b>{self._escape(right)}</b>", style),
                ]
            ],
            colWidths=[2.5 * inch, 2.5 * inch, 2.5 * inch],
        )
        tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), self._BAND_BG),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        return tbl

    def _three_col(self, left, mid, right) -> Table:
        """Plain triple-column row matching the band widths."""
        tbl = Table(
            [[left, mid, right]],
            colWidths=[2.5 * inch, 2.5 * inch, 2.5 * inch],
        )
        tbl.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        return tbl

    def _signer_signature_cell(
        self,
        r: RecipientCertEntry,
        body: ParagraphStyle,
        small: ParagraphStyle,
    ):
        """Signature cell: adopted signature image atop adoption text."""
        rows: list = []
        if r.signature_image:
            try:
                raw = r.signature_image.split(",")[-1]
                img = io.BytesIO(base64.b64decode(raw))
                rl_img = RLImage(img, width=1.6 * inch, height=0.55 * inch)
                rl_img.hAlign = "LEFT"
                rows.append(rl_img)
            except Exception:
                # Bad image data — skip without aborting the certificate.
                pass
        rows.append(
            Paragraph(
                f"<b>Signature Adoption:</b> {self._escape(r.adoption_method)}<br/>"
                f"<b>Using IP Address:</b><br/>"
                f"{self._escape(r.ip_address or '')}",
                small,
            )
        )
        return rows

    def _band_style(self) -> ParagraphStyle:
        return ParagraphStyle(
            "band",
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=self._BAND_TEXT,
        )

    @staticmethod
    def _escape(text: str | None) -> str:
        if text is None:
            return ""
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def _fallback_certificate(self, fields: list[SignedFieldData]) -> CertificateData:
        """Minimal certificate when caller did not provide metadata.
        Keeps old callers (and tests) functional."""
        return CertificateData(
            envelope_id="N/A",
            subject="SignAble Envelope",
            signatures_count=sum(1 for f in fields if f.field_type == "signature"),
            initials_count=sum(1 for f in fields if f.field_type == "initials"),
        )


signature_applier = SignatureApplier()
