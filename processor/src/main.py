"""SignAble document processor — FastAPI service.

Stateless processing-only service. Three endpoints:
- POST /process           — extract text + page metadata
- POST /render-pages      — render pages to base64 PNG
- POST /apply-signatures  — stamp signatures onto a PDF
"""

from __future__ import annotations

import base64

from fastapi import FastAPI, HTTPException, UploadFile
from pydantic import BaseModel

from .format_converter import SUPPORTED_EXTS, detect_extension, to_pdf
from .pdf_processor import pdf_processor
from .pdf_renderer import pdf_renderer
from .signature_applier import (
    CertificateData,
    SignedFieldData,
    signature_applier,
)

app = FastAPI(title="SignAble Document Processor", version="0.1.0")


class PageDimension(BaseModel):
    width: float
    height: float


class ProcessResponse(BaseModel):
    page_count: int
    content_markdown: str
    page_dimensions: list[PageDimension]


class RenderPagesResponse(BaseModel):
    pages: list[str]  # base64 PNGs


class ApplySignaturesRequest(BaseModel):
    pdf_base64: str
    fields: list[SignedFieldData]
    page_dimensions: list[PageDimension]
    # Optional DocuSign-style audit trail. Only appended when
    # `include_certificate=True`; defaults to False so callers get
    # the bare signed document and persist the certificate separately.
    certificate: CertificateData | None = None
    include_certificate: bool = False


class ApplySignaturesResponse(BaseModel):
    signed_pdf_base64: str


class BuildCertificateRequest(BaseModel):
    certificate: CertificateData
    fields: list[SignedFieldData] = []


class BuildCertificateResponse(BaseModel):
    certificate_pdf_base64: str


class MergePdfsRequest(BaseModel):
    pdfs_base64: list[str]


class MergePdfsResponse(BaseModel):
    merged_pdf_base64: str


class SupportedFormatsResponse(BaseModel):
    extensions: list[str]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/supported-formats", response_model=SupportedFormatsResponse)
def supported_formats() -> SupportedFormatsResponse:
    return SupportedFormatsResponse(extensions=sorted(SUPPORTED_EXTS))


def _coerce_to_pdf(raw: bytes, filename: str | None) -> bytes:
    """Validate + convert input to PDF. Raises HTTPException on failure."""
    ext = detect_extension(filename)
    if ext and ext not in SUPPORTED_EXTS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported format: {ext}. Allowed: {sorted(SUPPORTED_EXTS)}",
        )
    try:
        return to_pdf(raw, filename)
    except ValueError as e:
        raise HTTPException(status_code=415, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Conversion failed: {e}")


@app.post("/process", response_model=ProcessResponse)
async def process_document(file: UploadFile) -> ProcessResponse:
    """Extract text content + page metadata. Accepts PDF or image."""
    raw = await file.read()
    pdf_bytes = _coerce_to_pdf(raw, file.filename)
    try:
        result = await pdf_processor.extract_content(pdf_bytes)
        count = pdf_processor.page_count(pdf_bytes)
        dims = pdf_processor.page_dimensions(pdf_bytes)
        return ProcessResponse(
            page_count=count,
            content_markdown=result.content,
            page_dimensions=[PageDimension(width=w, height=h) for w, h in dims],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Process failed: {e}")


@app.post("/render-pages", response_model=RenderPagesResponse)
async def render_pages(file: UploadFile) -> RenderPagesResponse:
    """Render each page as base64-encoded PNG. Accepts PDF or image."""
    raw = await file.read()
    pdf_bytes = _coerce_to_pdf(raw, file.filename)
    try:
        page_images = pdf_renderer.render_pages(pdf_bytes)
        return RenderPagesResponse(
            pages=[base64.b64encode(img).decode() for img in page_images]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Render failed: {e}")


@app.post("/apply-signatures", response_model=ApplySignaturesResponse)
async def apply_signatures(
    body: ApplySignaturesRequest,
) -> ApplySignaturesResponse:
    """Apply signatures to PDF. Returns signed PDF as base64."""
    try:
        pdf_bytes = base64.b64decode(body.pdf_base64)
        dims = [(d.width, d.height) for d in body.page_dimensions]
        signed = signature_applier.apply(
            pdf_bytes,
            body.fields,
            dims,
            certificate=body.certificate,
            include_certificate=body.include_certificate,
        )
        return ApplySignaturesResponse(
            signed_pdf_base64=base64.b64encode(signed).decode()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Apply failed: {e}")


@app.post("/build-certificate", response_model=BuildCertificateResponse)
async def build_certificate(body: BuildCertificateRequest) -> BuildCertificateResponse:
    """Render Certificate of Completion as a standalone PDF."""
    try:
        cert_bytes = signature_applier.build_certificate(body.certificate, body.fields)
        return BuildCertificateResponse(
            certificate_pdf_base64=base64.b64encode(cert_bytes).decode()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Certificate build failed: {e}")


@app.post("/merge-pdfs", response_model=MergePdfsResponse)
async def merge_pdfs(body: MergePdfsRequest) -> MergePdfsResponse:
    """Concatenate PDFs in order, return combined PDF."""
    try:
        decoded = [base64.b64decode(s) for s in body.pdfs_base64 if s]
        merged = signature_applier.merge_pdfs(decoded)
        return MergePdfsResponse(merged_pdf_base64=base64.b64encode(merged).decode())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Merge failed: {e}")
