"""Convert input formats to PDF for unified downstream processing.

Strategy:
  - PDF passthrough
  - Image (PNG/JPG/TIFF/BMP/HEIC) → single-page PDF via Pillow
  - Future: DOCX/PPTX/XLSX via LibreOffice headless (requires soffice on PATH)
"""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image

IMAGE_EXTS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".tif",
    ".tiff",
    ".bmp",
    ".gif",
    ".heic",
    ".heif",
}
PDF_EXTS = {".pdf"}

SUPPORTED_EXTS = IMAGE_EXTS | PDF_EXTS


def is_pdf(data: bytes) -> bool:
    return data[:4] == b"%PDF"


def detect_extension(filename: str | None) -> str:
    if not filename:
        return ""
    return Path(filename).suffix.lower()


def to_pdf(data: bytes, filename: str | None) -> bytes:
    """Coerce input bytes to PDF bytes. Raises ValueError on unsupported types."""
    ext = detect_extension(filename)

    if is_pdf(data) or ext in PDF_EXTS:
        return data

    if ext in IMAGE_EXTS:
        return _image_to_pdf(data)

    raise ValueError(
        f"Unsupported format: {ext or 'unknown'}. Supported: {sorted(SUPPORTED_EXTS)}"
    )


def _image_to_pdf(data: bytes) -> bytes:
    """Wrap a single image as a 1-page PDF preserving aspect ratio."""
    img = Image.open(io.BytesIO(data))
    if img.mode in ("RGBA", "LA", "P"):
        # PDF cannot embed alpha. Composite onto white.
        bg = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        bg.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    out = io.BytesIO()
    img.save(out, format="PDF", resolution=150.0)
    return out.getvalue()
