import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.services.pdf_llm_service import (
    EmptyPdfTextError,
    LlmExtractionError,
    NotAnExamError,
    extract_questions_from_pdf_with_llm,
)

router = APIRouter(prefix="/pdf", tags=["pdf"])

MAX_PDF_SIZE_MB = 10
MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024
CHUNK_SIZE = 1024 * 1024

BASE_DIR = Path(__file__).resolve().parents[1]
INCOMING_DIR = BASE_DIR / "storage" / "incoming_pdfs"
INCOMING_DIR.mkdir(parents=True, exist_ok=True)


def _remove_file(path: Path) -> None:
    if path.exists():
        path.unlink()


async def _save_uploaded_pdf(pdf: UploadFile) -> Path:
    if pdf.content_type and pdf.content_type.lower() != "application/pdf":
        raise HTTPException(status_code=400, detail="Arquivo deve ser PDF.")

    if pdf.size is not None and pdf.size > MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Arquivo acima do limite de {MAX_PDF_SIZE_MB} MB.",
        )

    header = await pdf.read(5)
    if len(header) < 5 or header != b"%PDF-":
        raise HTTPException(status_code=400, detail="Arquivo não parece um PDF válido.")

    target_path = INCOMING_DIR / f"{uuid.uuid4().hex}.pdf"
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
        _remove_file(target_path)
        raise
    except Exception as exc:
        _remove_file(target_path)
        raise HTTPException(status_code=500, detail="Falha ao salvar o PDF.") from exc
    finally:
        await pdf.close()

    return target_path


@router.post("/receive")
async def receive_pdf(
    pdf: UploadFile = File(...),
    num_questions: int | None = Form(None),
):
    if num_questions is not None and num_questions < 1:
        raise HTTPException(status_code=400, detail="Quantidade de questões inválida.")

    target_path = await _save_uploaded_pdf(pdf)

    try:
        questions = extract_questions_from_pdf_with_llm(target_path, num_questions)
    except NotAnExamError as exc:
        raise HTTPException(
            status_code=422,
            detail="O arquivo enviado não parece ser uma prova válida. Envie apenas questionários e listas de exercícios.",
        ) from exc
    except EmptyPdfTextError as exc:
        raise HTTPException(
            status_code=422,
            detail="O PDF parece estar vazio ou não contém texto legível.",
        ) from exc
    except LlmExtractionError as exc:
        raise HTTPException(
            status_code=503,
            detail="Não foi possível processar a prova no momento.",
        ) from exc
    finally:
        _remove_file(target_path)

    return {
        "ok": True,
        "questions": questions,
        "warnings": [],
    }


@router.post("/validate")
async def validate_pdf(pdf: UploadFile = File(...)):
    target_path = await _save_uploaded_pdf(pdf)
    _remove_file(target_path)
    return {"ok": True}
