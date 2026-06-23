from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.authorization import (
    ensure_attempt_access,
    ensure_attempt_is_writable,
    ensure_attempt_write_access,
    require_aluno,
)
from app.core.database import get_db
from app.core.security import AuthContext, get_auth_context
from app.schemas.attempt import (
    AttemptCreate,
    AttemptRead,
    AttemptUpdate,
    VisitorAttemptCreate,
    VisitorAttemptRead,
)
from app.models.activities import Activity
from app.models.attempts import Attempt
from app.models.users import RoleEnum
from app.services.activity_service import ActivityService
from app.services.attempt_service import AttemptService
from app.services.attempt_pdf_service import AttemptPdfError, AttemptPdfService
from app.services.visitor_attempt_service import VisitorAttemptService

router = APIRouter(prefix="/attempts", tags=["attempts"])


# Helper de busca com 404
def _get_attempt_or_404(service: AttemptService, attempt_id: uuid.UUID):
    attempt = service.get(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa não encontrada.")
    return attempt


# Criacao de tentativa
@router.post("", response_model=AttemptRead, status_code=status.HTTP_201_CREATED)
def create_attempt(
    data: AttemptCreate,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    aluno = require_aluno(context)
    activity_service = ActivityService(db)
    activity = activity_service.get(data.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada.")
    if activity_service.is_closed(activity):
        raise HTTPException(status_code=409, detail="Atividade encerrada.")
    can_open_activity = (
        activity.owner_id == aluno.id
        or activity.is_shareable
    )
    if not can_open_activity:
        raise HTTPException(status_code=403, detail="Atividade indisponível para este aluno.")
    if activity_service.has_reached_attempt_limit(activity, aluno.id):
        raise HTTPException(status_code=409, detail="Limite de tentativas atingido.")

    visitor_name = (data.visitor_name or "").strip()
    if data.visitor_name is not None and not visitor_name:
        raise HTTPException(status_code=400, detail="Nome do visitante não pode ser vazio.")

    payload = data.model_copy(update={"aluno_id": aluno.id, "visitor_name": None})
    return AttemptService(db).create(payload)


@router.post("/visitor", response_model=VisitorAttemptRead, status_code=status.HTTP_201_CREATED)
def create_visitor_attempt(data: VisitorAttemptCreate, db: Session = Depends(get_db)):
    try:
        return VisitorAttemptService(db).create_attempt(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


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
    visitor_service = VisitorAttemptService(db)
    if context.kind == "visitor" and visitor_service.is_activity_expired(attempt.activity):
        raise HTTPException(status_code=410, detail="Tentativa expirada. Gere uma nova atividade.")
    ensure_attempt_is_writable(db, attempt)
    if context.kind == "user" and context.user and context.user.role == RoleEnum.aluno:
        data = data.model_copy(update={"aluno_id": context.user.id})
    elif context.kind == "visitor":
        data = data.model_copy(update={"aluno_id": None, "visitor_name": attempt.visitor_name})
    return service.update(attempt, data)


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
    visitor_service = VisitorAttemptService(db)
    if visitor_service.is_visitor_activity(activity) and visitor_service.is_activity_expired(activity):
        raise HTTPException(status_code=410, detail="Tentativa expirada. Gere uma nova atividade.")

    try:
        generated_pdf = AttemptPdfService(db).generate_for_attempt(attempt)
    except AttemptPdfError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return FileResponse(
        path=generated_pdf.path,
        media_type="application/pdf",
        filename=generated_pdf.filename,
    )
