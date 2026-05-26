from datetime import datetime, timezone
from pathlib import Path
import re
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.attempt import AttemptCreate, AttemptRead, AttemptUpdate
from app.models.attempts import AttemptStatus
from app.services.activity_service import ActivityService
from app.services.answer_service import AnswerService
from app.services.attempt_service import AttemptService
from app.services.question_service import QuestionService
from app.services.user_service import UserService

router = APIRouter(prefix="/attempts", tags=["attempts"])

BASE_DIR = Path(__file__).resolve().parents[1]
GENERATED_DIR = BASE_DIR / "storage" / "generated_pdfs"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

INVALID_FILENAME_RE = re.compile(r"[<>:\"/\\|?*\x00-\x1F]+")
MAX_FILENAME_LENGTH = 150


# Helper de busca com 404
def _get_attempt_or_404(service: AttemptService, attempt_id: uuid.UUID):
    attempt = service.get(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")
    return attempt


def _sanitize_filename(value: str) -> str:
    cleaned = INVALID_FILENAME_RE.sub("", value or "").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        return "respostas"
    return cleaned[:MAX_FILENAME_LENGTH].rstrip()


def _answer_text(answer, question) -> str:
    if not answer:
        return "Sem resposta."
    if answer.response_text:
        text = answer.response_text.strip()
        return text or "Sem resposta."
    if answer.chosen_letter:
        if question and getattr(question, "options", None):
            for option in question.options:
                if option.letter == answer.chosen_letter:
                    return f"{answer.chosen_letter}) {option.text}"
        return answer.chosen_letter
    return "Sem resposta."


def _build_attempt_pdf(
    file_path: Path,
    activity_name: str,
    professor_name: str,
    aluno_name: str,
    questions,
    answers_by_question,
    generated_at: datetime,
):
    try:
        from fpdf import FPDF
    except ImportError as exc:
        raise HTTPException(
            status_code=500,
            detail="Biblioteca fpdf2 nao instalada. Instale com: pip install fpdf2",
        ) from exc

    def _safe_text(s) -> str:
        if s is None:
            return ""
        if not isinstance(s, str):
            s = str(s)
        try:
            return s.encode("latin-1", "replace").decode("latin-1")
        except Exception:
            return s

    pdf = FPDF()
    pdf.set_left_margin(15)
    pdf.set_top_margin(15)
    pdf.set_right_margin(15)
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    activity_name  = _safe_text(activity_name)
    professor_name = _safe_text(professor_name)
    aluno_name     = _safe_text(aluno_name)

    w = pdf.epw

    pdf.set_font("Arial", size=14)
    pdf.multi_cell(w, 7, txt=f"Atividade: {activity_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Arial", size=11)
    pdf.multi_cell(w, 6, txt=f"Professor: {professor_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.multi_cell(w, 6, txt=f"Aluno: {aluno_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Arial", size=12)
    if not questions:
        pdf.multi_cell(w, 6, txt="Nenhuma questao encontrada.", new_x="LMARGIN", new_y="NEXT")

    for index, question in enumerate(questions, 1):
        prompt = _safe_text(getattr(question, "prompt", ""))
        pdf.multi_cell(w, 6, txt=f"{index}. {prompt}", new_x="LMARGIN", new_y="NEXT")
        answer_text = _safe_text(_answer_text(answers_by_question.get(question.id), question))
        pdf.set_font("Arial", size=11)
        pdf.multi_cell(w, 6, txt=f"Resposta: {answer_text}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)
        pdf.set_font("Arial", size=12)

    pdf.ln(2)
    pdf.set_font("Helvetica", size=10)
    generated_label = generated_at.astimezone().strftime("%d/%m/%Y %H:%M")
    pdf.cell(w, 6, txt=f"Gerado em: {generated_label}", new_x="LMARGIN", new_y="NEXT")

    pdf.output(str(file_path))

# Criacao de tentativa
@router.post("", response_model=AttemptRead, status_code=status.HTTP_201_CREATED)
def create_attempt(data: AttemptCreate, db: Session = Depends(get_db)):
    activity = ActivityService(db).get(data.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    if data.aluno_id:
        user = UserService(db).get(data.aluno_id)
        if not user:
            raise HTTPException(status_code=404, detail="Aluno not found.")

    if not data.aluno_id and not data.visitor_name:
        raise HTTPException(status_code=400, detail="Aluno or visitor required.")

    return AttemptService(db).create(data)


# Listagem de tentativas
@router.get("", response_model=List[AttemptRead])
def list_attempts(
    activity_id: Optional[uuid.UUID] = None,
    aluno_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    return AttemptService(db).list(
        activity_id=activity_id,
        aluno_id=aluno_id,
        skip=skip,
        limit=limit,
    )


# Consulta de tentativa
@router.get("/{attempt_id}", response_model=AttemptRead)
def get_attempt(attempt_id: uuid.UUID, db: Session = Depends(get_db)):
    service = AttemptService(db)
    return _get_attempt_or_404(service, attempt_id)


# Atualizacao de tentativa
@router.put("/{attempt_id}", response_model=AttemptRead)
def update_attempt(
    attempt_id: uuid.UUID,
    data: AttemptUpdate,
    db: Session = Depends(get_db),
):
    service = AttemptService(db)
    attempt = _get_attempt_or_404(service, attempt_id)
    if attempt.status == AttemptStatus.concluido:
        raise HTTPException(status_code=409, detail="Attempt already concluded.")
    return service.update(attempt, data)


# Remocao de tentativa
@router.delete("/{attempt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attempt(attempt_id: uuid.UUID, db: Session = Depends(get_db)):
    service = AttemptService(db)
    attempt = _get_attempt_or_404(service, attempt_id)
    if attempt.status == AttemptStatus.concluido:
        raise HTTPException(status_code=409, detail="Attempt already concluded.")
    service.delete(attempt)
    return None


# Geracao de PDF da tentativa
@router.get("/{attempt_id}/pdf")
def generate_attempt_pdf(attempt_id: uuid.UUID, db: Session = Depends(get_db)):
    service = AttemptService(db)
    attempt = _get_attempt_or_404(service, attempt_id)

    activity = ActivityService(db).get(attempt.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    professor = UserService(db).get(activity.owner_id)
    if not professor:
        raise HTTPException(status_code=404, detail="Professor not found.")

    questions = QuestionService(db).list(activity_id=activity.id, skip=0, limit=1000)
    answers = AnswerService(db).list(attempt_id=attempt.id, skip=0, limit=1000)
    answers_by_question = {answer.question_id: answer for answer in answers}

    aluno_name = attempt.aluno.name if attempt.aluno else attempt.visitor_name or "Visitante"

    base_filename = f"{activity.name} - {professor.name} - {aluno_name}"
    safe_filename = _sanitize_filename(base_filename)
    file_name = f"{safe_filename}.pdf"
    file_path = GENERATED_DIR / file_name

    generated_at = datetime.now(timezone.utc)
    _build_attempt_pdf(
        file_path=file_path,
        activity_name=activity.name,
        professor_name=professor.name,
        aluno_name=aluno_name,
        questions=questions,
        answers_by_question=answers_by_question,
        generated_at=generated_at,
    )

    attempt.pdf_url = f"/attempts/{attempt.id}/pdf"
    attempt.pdf_generated_at = generated_at
    db.add(attempt)
    db.commit()

    return FileResponse(path=file_path, media_type="application/pdf", filename=file_name)
