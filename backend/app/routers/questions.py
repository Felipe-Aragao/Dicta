from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.authorization import (
    ensure_activity_read_access,
    ensure_activity_owner,
)
from app.core.database import get_db
from app.core.security import AuthContext, get_auth_context
from app.schemas.question import QuestionCreate, QuestionRead
from app.services.activity_service import ActivityService
from app.services.question_service import QuestionService

router = APIRouter(prefix="/questions", tags=["questions"])


# Criacao de questao
@router.post("", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
def create_question(
    data: QuestionCreate,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    activity = ActivityService(db).get(data.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada.")
    ensure_activity_owner(context, activity)
    return QuestionService(db).create(data)


# Listagem de questoes
@router.get("", response_model=List[QuestionRead])
def list_questions(
    activity_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    if not activity_id:
        raise HTTPException(status_code=400, detail="activity_id é obrigatório.")
    activity = ActivityService(db).get(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada.")
    ensure_activity_read_access(db, context, activity)
    return QuestionService(db).list(activity_id=activity_id, skip=skip, limit=limit)


