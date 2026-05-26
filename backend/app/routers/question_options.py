from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.question_option import (
    QuestionOptionCreate,
    QuestionOptionRead,
    QuestionOptionUpdate,
)
from app.services.question_option_service import QuestionOptionService
from app.services.question_service import QuestionService

router = APIRouter(prefix="/question-options", tags=["question-options"])


# Helper de busca com 404
def _get_option_or_404(service: QuestionOptionService, option_id: uuid.UUID):
    option = service.get(option_id)
    if not option:
        raise HTTPException(status_code=404, detail="Opção não encontrada.")
    return option


# Criacao de opcao
@router.post("", response_model=QuestionOptionRead, status_code=status.HTTP_201_CREATED)
def create_option(data: QuestionOptionCreate, db: Session = Depends(get_db)):
    question = QuestionService(db).get(data.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")
    return QuestionOptionService(db).create(data)


# Listagem de opcoes
@router.get("", response_model=List[QuestionOptionRead])
def list_options(
    question_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return QuestionOptionService(db).list(question_id=question_id, skip=skip, limit=limit)


# Consulta de opcao
@router.get("/{option_id}", response_model=QuestionOptionRead)
def get_option(option_id: uuid.UUID, db: Session = Depends(get_db)):
    service = QuestionOptionService(db)
    return _get_option_or_404(service, option_id)


# Atualizacao de opcao
@router.put("/{option_id}", response_model=QuestionOptionRead)
def update_option(
    option_id: uuid.UUID,
    data: QuestionOptionUpdate,
    db: Session = Depends(get_db),
):
    service = QuestionOptionService(db)
    option = _get_option_or_404(service, option_id)
    return service.update(option, data)


# Remocao de opcao
@router.delete("/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_option(option_id: uuid.UUID, db: Session = Depends(get_db)):
    service = QuestionOptionService(db)
    option = _get_option_or_404(service, option_id)
    service.delete(option)
    return None
