"""Render PDF pages to PNG images via pdf2image (poppler)."""

from __future__ import annotations

import io

from pdf2image import convert_from_bytes


class PDFRenderer:
    """Convert PDF pages to PNG bytes."""

    def render_pages(self, pdf_bytes: bytes, dpi: int = 150) -> list[bytes]:
        """Render each page as optimized PNG. Returns one bytes object per page."""
        images = convert_from_bytes(pdf_bytes, dpi=dpi, fmt="png")
        result: list[bytes] = []
        for img in images:
            buf = io.BytesIO()
            img.save(buf, "PNG", optimize=True)
            result.append(buf.getvalue())
        return result


pdf_renderer = PDFRenderer()
