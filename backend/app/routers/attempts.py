from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.attempt import AttemptCreate, AttemptRead, AttemptUpdate
from app.services.activity_service import ActivityService
from app.services.attempt_service import AttemptService
from app.services.user_service import UserService

router = APIRouter(prefix="/attempts", tags=["attempts"])


# Helper de busca com 404
def _get_attempt_or_404(service: AttemptService, attempt_id: uuid.UUID):
    attempt = service.get(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")
    return attempt


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
    return service.update(attempt, data)


# Remocao de tentativa
@router.delete("/{attempt_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attempt(attempt_id: uuid.UUID, db: Session = Depends(get_db)):
    service = AttemptService(db)
    attempt = _get_attempt_or_404(service, attempt_id)
    service.delete(attempt)
    return None
