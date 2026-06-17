from typing import List, Optional
from urllib.parse import parse_qs, unquote, urlparse
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.authorization import (
    ensure_activity_owner,
    ensure_activity_read_access,
    require_user,
)
from app.core.database import get_db
from app.core.security import AuthContext, get_auth_context
from app.models.activities import ActivityStatus
from app.models.activity_links import ActivityLink
from app.models.users import RoleEnum
from app.schemas.activity import ActivityCreate, ActivityRead, ActivityUpdate
from app.services.activity_service import ActivityService
from app.services.user_service import UserService

router = APIRouter(prefix="/activities", tags=["activities"])

SHARE_CODE_RE = re.compile(r"^[A-Z0-9]{6}$")


def _copy_model(model, **updates):
    if hasattr(model, "model_copy"):
        return model.model_copy(update=updates)
    return model.copy(update=updates)


# Helper de busca com 404
def _get_activity_or_404(service: ActivityService, activity_id: uuid.UUID):
    activity = service.get(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada.")
    return activity


def _ensure_professor_owner(db: Session, activity) -> None:
    owner = UserService(db).get(activity.owner_id)
    if not owner or owner.role != RoleEnum.professor:
        raise HTTPException(status_code=403, detail="Apenas professores podem compartilhar provas.")


def _normalize_share_code(value: str) -> str:
    decoded = unquote((value or "").strip())
    if not decoded:
        raise HTTPException(status_code=400, detail="Código inválido.")

    parsed = urlparse(decoded)
    query = parse_qs(parsed.query)
    if query.get("code"):
        decoded = query["code"][0]
    elif parsed.path and (parsed.scheme or parsed.netloc):
        decoded = parsed.path.rstrip("/").split("/")[-1]

    compact = re.sub(r"[^A-Za-z0-9]", "", decoded).upper()
    if not SHARE_CODE_RE.match(compact):
        raise HTTPException(status_code=400, detail="Código inválido.")
    return f"{compact[:3]}-{compact[3:]}"


# Criacao de atividade
@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def create_activity(
    data: ActivityCreate,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    owner = require_user(context)
    if owner.role not in {RoleEnum.aluno, RoleEnum.professor}:
        raise HTTPException(status_code=403, detail="Não é permitido criar atividades para este tipo de usuário.")
    data = _copy_model(data, owner_id=owner.id)
    if owner.role != RoleEnum.professor:
        data = _copy_model(data, is_shareable=False)
    return ActivityService(db).create(data)


# Listagem de atividades
@router.get("", response_model=List[ActivityRead])
def list_activities(
    owner_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    user = require_user(context)
    return ActivityService(db).list(owner_id=user.id, skip=skip, limit=limit)


@router.get("/by-code/{code}/resolve", response_model=ActivityRead)
def resolve_activity_by_code(
    code: str,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    normalized_code = _normalize_share_code(code)
    activity = ActivityService(db).get_by_code(normalized_code)
    if not activity:
        raise HTTPException(status_code=404, detail="Código não encontrado.")
    ensure_activity_read_access(db, context, activity)
    return activity


@router.get("/by-code/{code:path}", response_model=ActivityRead)
def get_activity_by_code(code: str, db: Session = Depends(get_db)):
    normalized_code = _normalize_share_code(code)
    activity = ActivityService(db).get_by_code(normalized_code)
    if not activity:
        raise HTTPException(status_code=404, detail="Código não encontrado.")
    if not activity.owner or activity.owner.role != RoleEnum.professor:
        activity.is_shareable = False
        db.add(activity)
        db.commit()
        raise HTTPException(status_code=404, detail="Código inativo.")
    if not activity.is_shareable:
        raise HTTPException(status_code=404, detail="Código inativo.")
    if activity.status == ActivityStatus.encerrado:
        raise HTTPException(status_code=409, detail="Atividade encerrada.")
    return activity


def _regenerate_activity_share_code(activity_id: uuid.UUID, db: Session, context: AuthContext) -> ActivityRead:
    service = ActivityService(db)
    activity = _get_activity_or_404(service, activity_id)
    ensure_activity_owner(context, activity)
    _ensure_professor_owner(db, activity)
    if activity.status == ActivityStatus.encerrado:
        raise HTTPException(status_code=409, detail="Prova encerrada não pode gerar novo código.")
    return service.regenerate_share_link(activity)


@router.post("/{activity_id}/regenerate-code", response_model=ActivityRead)
def regenerate_activity_code(
    activity_id: uuid.UUID,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    return _regenerate_activity_share_code(activity_id, db, context)


# Consulta de atividade
@router.get("/{activity_id}", response_model=ActivityRead)
def get_activity(
    activity_id: uuid.UUID,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    service = ActivityService(db)
    activity = _get_activity_or_404(service, activity_id)
    ensure_activity_read_access(db, context, activity)
    return activity


# Atualizacao de atividade
@router.put("/{activity_id}", response_model=ActivityRead)
def update_activity(
    activity_id: uuid.UUID,
    data: ActivityUpdate,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    service = ActivityService(db)
    activity = _get_activity_or_404(service, activity_id)
    ensure_activity_owner(context, activity)
    owner = UserService(db).get(activity.owner_id)
    if owner and owner.role != RoleEnum.professor:
        data = _copy_model(data, is_shareable=False)
    return service.update(activity, data)


# Remocao de atividade
@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: uuid.UUID,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    service = ActivityService(db)
    activity = _get_activity_or_404(service, activity_id)
    ensure_activity_owner(context, activity)
    service.delete(activity)
    return None
