from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.users import RoleEnum
from app.schemas.activity import ActivityCreate, ActivityRead, ActivityUpdate
from app.services.activity_service import ActivityService
from app.services.user_service import UserService

router = APIRouter(prefix="/activities", tags=["activities"])


# Helper de busca com 404
def _get_activity_or_404(service: ActivityService, activity_id: uuid.UUID):
    activity = service.get(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada.")
    return activity


# Criacao de atividade
@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def create_activity(data: ActivityCreate, db: Session = Depends(get_db)):
    user_service = UserService(db)
    owner = user_service.get(data.owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if owner.role not in {RoleEnum.aluno, RoleEnum.professor}:
        raise HTTPException(status_code=403, detail="Não é permitido criar atividades para este tipo de usuário.")
    return ActivityService(db).create(data)


# Listagem de atividades
@router.get("", response_model=List[ActivityRead])
def list_activities(
    owner_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    return ActivityService(db).list(owner_id=owner_id, skip=skip, limit=limit)


# Consulta de atividade
@router.get("/{activity_id}", response_model=ActivityRead)
def get_activity(activity_id: uuid.UUID, db: Session = Depends(get_db)):
    service = ActivityService(db)
    return _get_activity_or_404(service, activity_id)


# Atualizacao de atividade
@router.put("/{activity_id}", response_model=ActivityRead)
def update_activity(
    activity_id: uuid.UUID,
    data: ActivityUpdate,
    db: Session = Depends(get_db),
):
    service = ActivityService(db)
    activity = _get_activity_or_404(service, activity_id)
    return service.update(activity, data)


# Remocao de atividade
@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(activity_id: uuid.UUID, db: Session = Depends(get_db)):
    service = ActivityService(db)
    activity = _get_activity_or_404(service, activity_id)
    service.delete(activity)
    return None
