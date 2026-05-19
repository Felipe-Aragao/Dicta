import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(prefix="/pdf", tags=["pdf"])

MAX_PDF_SIZE_MB = 50
MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024
CHUNK_SIZE = 1024 * 1024

BASE_DIR = Path(__file__).resolve().parents[1]
INCOMING_DIR = BASE_DIR / "storage" / "incoming_pdfs"
INCOMING_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/receive")
async def receive_pdf(pdf: UploadFile = File(...)):
    if pdf.content_type and pdf.content_type.lower() != "application/pdf":
        raise HTTPException(status_code=400, detail="Arquivo deve ser PDF.")

    header = await pdf.read(5)
    if len(header) < 5 or header != b"%PDF-":
        raise HTTPException(status_code=400, detail="Arquivo nao parece um PDF valido.")

    file_id = uuid.uuid4().hex
    target_path = INCOMING_DIR / f"{file_id}.pdf"
    size_bytes = 0

    try:
        with target_path.open("wb") as out:
            out.write(header)
            size_bytes += len(header)

            while True:
                chunk = await pdf.read(CHUNK_SIZE)
                if not chunk:
                    break
                size_bytes += len(chunk)
                if size_bytes > MAX_PDF_SIZE_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Arquivo acima do limite de {MAX_PDF_SIZE_MB} MB.",
                    )
                out.write(chunk)
    except HTTPException:
        if target_path.exists():
            target_path.unlink()
        raise
    except Exception as exc:
        if target_path.exists():
            target_path.unlink()
        raise HTTPException(status_code=500, detail="Falha ao salvar o PDF.") from exc
    finally:
        await pdf.close()

    return {
        "ok": True,
        "file_id": file_id,
        "original_filename": pdf.filename,
        "size_bytes": size_bytes,
    }
