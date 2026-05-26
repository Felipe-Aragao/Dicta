from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.question import QuestionCreate, QuestionRead, QuestionUpdate
from app.services.activity_service import ActivityService
from app.services.question_service import QuestionService

router = APIRouter(prefix="/questions", tags=["questions"])


# Helper de busca com 404
def _get_question_or_404(service: QuestionService, question_id: uuid.UUID):
    question = service.get(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")
    return question


# Criacao de questao
@router.post("", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
def create_question(data: QuestionCreate, db: Session = Depends(get_db)):
    activity = ActivityService(db).get(data.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada.")
    return QuestionService(db).create(data)


# Listagem de questoes
@router.get("", response_model=List[QuestionRead])
def list_questions(
    activity_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return QuestionService(db).list(activity_id=activity_id, skip=skip, limit=limit)


# Consulta de questao
@router.get("/{question_id}", response_model=QuestionRead)
def get_question(question_id: uuid.UUID, db: Session = Depends(get_db)):
    service = QuestionService(db)
    return _get_question_or_404(service, question_id)


# Atualizacao de questao
@router.put("/{question_id}", response_model=QuestionRead)
def update_question(
    question_id: uuid.UUID,
    data: QuestionUpdate,
    db: Session = Depends(get_db),
):
    service = QuestionService(db)
    question = _get_question_or_404(service, question_id)
    return service.update(question, data)


# Remocao de questao
@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: uuid.UUID, db: Session = Depends(get_db)):
    service = QuestionService(db)
    question = _get_question_or_404(service, question_id)
    service.delete(question)
    return None
