"""PDF text extraction + metadata.

Uses pypdf directly. The upstream `doc_loader` package ships broken relative
imports (`from ..core.exceptions ...` from top-level `converters/`) and cannot
be imported as-is. Replace with native pypdf — same output shape (markdown
content + page count + dimensions). Swap back if upstream fixes the package.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

from pypdf import PdfReader


@dataclass
class ConverterResult:
    """Mirror shape of doc_loader.converters.base.ConverterResult."""

    content: str
    title: str | None = None


class PDFProcessor:
    """Extract markdown content + metadata from PDF bytes."""

    async def extract_content(self, pdf_bytes: bytes) -> ConverterResult:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        parts: list[str] = []
        title: str | None = None

        for page_num, page in enumerate(reader.pages, 1):
            try:
                text = page.extract_text() or ""
            except Exception as e:
                parts.append(f"## Page {page_num}\n\n*Error extracting text: {e}*\n")
                continue
            text = text.strip()
            if text:
                parts.append(f"## Page {page_num}\n\n{text}\n")
                if title is None:
                    for line in text.splitlines():
                        clean = line.strip()
                        if clean:
                            title = clean[:100]
                            break

        return ConverterResult(content="\n".join(parts), title=title)

    def page_count(self, pdf_bytes: bytes) -> int:
        return len(PdfReader(io.BytesIO(pdf_bytes)).pages)

    def page_dimensions(self, pdf_bytes: bytes) -> list[tuple[float, float]]:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        return [
            (float(p.mediabox.width), float(p.mediabox.height)) for p in reader.pages
        ]


pdf_processor = PDFProcessor()
