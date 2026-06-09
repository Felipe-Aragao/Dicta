from datetime import datetime, timedelta, timezone
from pathlib import Path
import re
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.authorization import ensure_attempt_access, ensure_attempt_write_access, require_aluno
from app.core.database import get_db
from app.core.security import AuthContext, create_visitor_attempt_token, get_auth_context
from app.schemas.attempt import (
    AttemptCreate,
    AttemptRead,
    AttemptUpdate,
    VisitorAttemptCreate,
    VisitorAttemptRead,
)
from app.schemas.activity import ActivityCreate
from app.schemas.user import UserCreate
from app.models.activities import Activity, ActivityStatus
from app.models.answers import Answer
from app.models.attempts import Attempt, AttemptStatus
from app.models.questions import Question
from app.models.question_options import QuestionOption
from app.models.users import RoleEnum
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

VISITOR_OWNER_EMAIL = "visitante@dicta.app"
VISITOR_OWNER_NAME = "Visitante"
VISITOR_ACTIVITY_PREFIX = "Atividade Visitante"
VISITOR_RETENTION_HOURS = 1


# Helper de busca com 404
def _get_attempt_or_404(service: AttemptService, attempt_id: uuid.UUID):
    attempt = service.get(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa não encontrada.")
    return attempt


def _sanitize_filename(value: str) -> str:
    cleaned = INVALID_FILENAME_RE.sub("", value or "").strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        return "respostas"
    return cleaned[:MAX_FILENAME_LENGTH].rstrip()


def _ensure_aware(dt: datetime) -> datetime:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _get_or_create_visitor_owner(db: Session):
    service = UserService(db)
    user = service.get_by_email(VISITOR_OWNER_EMAIL)
    if user:
        return user
    return service.create(
        UserCreate(
            role=RoleEnum.professor,
            name=VISITOR_OWNER_NAME,
            email=VISITOR_OWNER_EMAIL,
            password_hash=None,
        )
    )


def _cleanup_expired_visitor_data(db: Session) -> None:
    owner = _get_or_create_visitor_owner(db)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=VISITOR_RETENTION_HOURS)

    expired_activity_ids = [
        row[0]
        for row in (
            db.query(Activity.id)
            .filter(Activity.owner_id == owner.id)
            .filter(Activity.created_at < cutoff)
            .all()
        )
    ]
    if not expired_activity_ids:
        return

    attempt_ids = [
        row[0]
        for row in (
            db.query(Attempt.id)
            .filter(Attempt.activity_id.in_(expired_activity_ids))
            .all()
        )
    ]
    if attempt_ids:
        db.query(Answer).filter(Answer.attempt_id.in_(attempt_ids)).delete(
            synchronize_session=False
        )
        db.query(Attempt).filter(Attempt.id.in_(attempt_ids)).delete(
            synchronize_session=False
        )

    question_ids = [
        row[0]
        for row in (
            db.query(Question.id)
            .filter(Question.activity_id.in_(expired_activity_ids))
            .all()
        )
    ]
    if question_ids:
        db.query(QuestionOption).filter(QuestionOption.question_id.in_(question_ids)).delete(
            synchronize_session=False
        )
        db.query(Question).filter(Question.id.in_(question_ids)).delete(
            synchronize_session=False
        )

    db.query(Activity).filter(Activity.id.in_(expired_activity_ids)).delete(
        synchronize_session=False
    )
    db.commit()


def _is_visitor_activity(db: Session, activity: Activity) -> bool:
    owner = _get_or_create_visitor_owner(db)
    return activity.owner_id == owner.id


def _is_activity_expired(activity: Activity) -> bool:
    created_at = _ensure_aware(activity.created_at)
    if not created_at:
        return False
    return created_at < datetime.now(timezone.utc) - timedelta(hours=VISITOR_RETENTION_HOURS)


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
            detail="Biblioteca fpdf2 nao instalada",
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
def create_attempt(
    data: AttemptCreate,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    aluno = require_aluno(context)
    activity = ActivityService(db).get(data.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada.")
    can_open_activity = (
        activity.owner_id == aluno.id
        or (activity.is_shareable and activity.status != ActivityStatus.encerrado)
    )
    if not can_open_activity:
        raise HTTPException(status_code=403, detail="Atividade indisponível para este aluno.")

    visitor_name = (data.visitor_name or "").strip()
    if data.visitor_name is not None and not visitor_name:
        raise HTTPException(status_code=400, detail="Nome do visitante não pode ser vazio.")

    payload = data.model_copy(update={"aluno_id": aluno.id, "visitor_name": None})
    return AttemptService(db).create(payload)


@router.post("/visitor", response_model=VisitorAttemptRead, status_code=status.HTTP_201_CREATED)
def create_visitor_attempt(data: VisitorAttemptCreate, db: Session = Depends(get_db)):
    _cleanup_expired_visitor_data(db)

    owner = _get_or_create_visitor_owner(db)
    visitor_name = data.visitor_name.strip()
    if not visitor_name:
        raise HTTPException(status_code=400, detail="Nome do visitante não pode ser vazio.")

    activity_name = (data.activity_name or "").strip() or f"{VISITOR_ACTIVITY_PREFIX} - {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}"

    activity = ActivityService(db).create(
        data=ActivityCreate(
            owner_id=owner.id,
            name=activity_name,
            discipline="visitante",
            status=ActivityStatus.rascunho,
            is_shareable=False,
        )
    )

    option_letters = ["A", "B", "C", "D", "E", "F"]
    for index, item in enumerate(data.questions or [], 1):
        prompt = (item.prompt or "").strip()
        if not prompt:
            prompt = "Questao sem enunciado"

        q_type = item.type if item.type in {"multiple", "open"} else "open"
        if item.options:
            q_type = "multiple"

        question = Question(
            activity_id=activity.id,
            position=item.position or index,
            type=q_type,
            prompt=prompt,
        )
        db.add(question)
        db.flush()

        options = item.options or []
        for opt_index, opt_text in enumerate(options):
            letter = option_letters[opt_index] if opt_index < len(option_letters) else None
            text = (opt_text or "").strip()
            if not letter or not text:
                continue
            db.add(
                QuestionOption(
                    question_id=question.id,
                    letter=letter,
                    text=text,
                )
            )

    attempt = Attempt(
        activity_id=activity.id,
        visitor_name=visitor_name,
        status=AttemptStatus.em_progresso,
        started_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    activity.total_responses = 1
    db.add(activity)
    db.commit()
    db.refresh(attempt)

    questions = QuestionService(db).list(activity_id=activity.id, skip=0, limit=1000)
    created_at = _ensure_aware(activity.created_at) or datetime.now(timezone.utc)
    expires_at = created_at + timedelta(hours=VISITOR_RETENTION_HOURS)

    access_token = create_visitor_attempt_token(
        attempt_id=attempt.id,
        activity_id=activity.id,
        expires_at=expires_at,
    )

    return VisitorAttemptRead(
        access_token=access_token,
        token_type="bearer",
        attempt=attempt,
        questions=questions,
        expires_at=expires_at,
    )


# Listagem de tentativas
@router.get("", response_model=List[AttemptRead])
def list_attempts(
    activity_id: Optional[uuid.UUID] = None,
    aluno_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    if context.kind == "visitor":
        if not context.visitor_attempt_id:
            return []
        attempt = AttemptService(db).get(context.visitor_attempt_id)
        return [attempt] if attempt else []

    user = context.user
    if not user:
        raise HTTPException(status_code=403, detail="Acesso não autorizado.")

    if user.role == RoleEnum.aluno:
        return AttemptService(db).list(
            activity_id=activity_id,
            aluno_id=user.id,
            skip=skip,
            limit=limit,
        )

    if user.role == RoleEnum.professor:
        query = db.query(Attempt).join(Activity, Attempt.activity_id == Activity.id).filter(Activity.owner_id == user.id)
        if activity_id:
            query = query.filter(Attempt.activity_id == activity_id)
        return query.order_by(Attempt.started_at.desc(), Attempt.submitted_at.desc()).offset(skip).limit(limit).all()

    raise HTTPException(status_code=403, detail="Acesso não autorizado.")


# Consulta de tentativa
@router.get("/{attempt_id}", response_model=AttemptRead)
def get_attempt(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    service = AttemptService(db)
    attempt = _get_attempt_or_404(service, attempt_id)
    ensure_attempt_access(db, context, attempt)
    ensure_attempt_write_access(context, attempt)
    return attempt


# Atualizacao de tentativa
@router.put("/{attempt_id}", response_model=AttemptRead)
def update_attempt(
    attempt_id: uuid.UUID,
    data: AttemptUpdate,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    service = AttemptService(db)
    attempt = _get_attempt_or_404(service, attempt_id)
    ensure_attempt_access(db, context, attempt)
    ensure_attempt_write_access(context, attempt)
    if context.kind == "visitor" and _is_activity_expired(attempt.activity):
        raise HTTPException(status_code=410, detail="Tentativa expirada. Gere uma nova atividade.")
    if attempt.status == AttemptStatus.concluido:
        raise HTTPException(status_code=409, detail="Tentativa já concluída.")
    if context.kind == "user" and context.user and context.user.role == RoleEnum.aluno:
        data = data.model_copy(update={"aluno_id": context.user.id})
    elif context.kind == "visitor":
        data = data.model_copy(update={"aluno_id": None, "visitor_name": attempt.visitor_name})
    return service.update(attempt, data)


# Remocao de tentativa
@router.delete("/{attempt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attempt(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    service = AttemptService(db)
    attempt = _get_attempt_or_404(service, attempt_id)
    ensure_attempt_access(db, context, attempt)
    if attempt.status == AttemptStatus.concluido:
        raise HTTPException(status_code=409, detail="Tentativa já concluída.")
    service.delete(attempt)
    return None


# Geracao de PDF da tentativa
@router.get("/{attempt_id}/pdf")
def generate_attempt_pdf(
    attempt_id: uuid.UUID,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    service = AttemptService(db)
    attempt = _get_attempt_or_404(service, attempt_id)
    ensure_attempt_access(db, context, attempt)

    activity = ActivityService(db).get(attempt.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada.")

    if _is_visitor_activity(db, activity) and _is_activity_expired(activity):
        raise HTTPException(status_code=410, detail="Tentativa expirada. Gere uma nova atividade.")

    professor = UserService(db).get(activity.owner_id)
    if not professor:
        raise HTTPException(status_code=404, detail="Professor não encontrado.")

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
