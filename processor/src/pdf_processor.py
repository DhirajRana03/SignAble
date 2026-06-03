"""PDF text extraction + metadata.

Sole file in processor that imports `doc_loader`. Keeps third-party coupling isolated.
"""

from __future__ import annotations

import io

from pypdf import PdfReader


class PDFProcessor:
    """Wraps doc_loader's PDFConverter and pypdf for PDF metadata extraction."""

    def __init__(self) -> None:
        # Import lazily so module load does not hit doc_loader during tests.
        # Package publishes top-level `converters/` despite repo name `doc_loader`.
        from converters.pdf import PDFConverter

        self._converter = PDFConverter()

    async def extract_content(self, pdf_bytes: bytes):
        """Extract markdown content via doc_loader. Returns ConverterResult."""
        return await self._converter.convert(io.BytesIO(pdf_bytes))

    def page_count(self, pdf_bytes: bytes) -> int:
        return len(PdfReader(io.BytesIO(pdf_bytes)).pages)

    def page_dimensions(self, pdf_bytes: bytes) -> list[tuple[float, float]]:
        """Return [(width, height)] in PDF points per page."""
        reader = PdfReader(io.BytesIO(pdf_bytes))
        return [
            (float(p.mediabox.width), float(p.mediabox.height)) for p in reader.pages
        ]


pdf_processor = PDFProcessor()
