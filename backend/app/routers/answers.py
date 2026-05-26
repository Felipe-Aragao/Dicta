from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.answer import AnswerCreate, AnswerRead, AnswerUpdate
from app.services.answer_service import AnswerService
from app.services.attempt_service import AttemptService
from app.models.attempts import AttemptStatus
from app.services.question_service import QuestionService

router = APIRouter(prefix="/answers", tags=["answers"])


# Helper de busca com 404
def _get_answer_or_404(service: AnswerService, answer_id: uuid.UUID):
    answer = service.get(answer_id)
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found.")
    return answer


# Criacao de resposta
@router.post("", response_model=AnswerRead, status_code=status.HTTP_201_CREATED)
def create_answer(data: AnswerCreate, db: Session = Depends(get_db)):
    attempt = AttemptService(db).get(data.attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found.")
    if attempt.status == AttemptStatus.concluido:
        raise HTTPException(status_code=409, detail="Attempt already concluded.")

    question = QuestionService(db).get(data.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    return AnswerService(db).create(data)


# Listagem de respostas
@router.get("", response_model=List[AnswerRead])
def list_answers(
    attempt_id: Optional[uuid.UUID] = None,
    question_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return AnswerService(db).list(
        attempt_id=attempt_id,
        question_id=question_id,
        skip=skip,
        limit=limit,
    )


# Consulta de resposta
@router.get("/{answer_id}", response_model=AnswerRead)
def get_answer(answer_id: uuid.UUID, db: Session = Depends(get_db)):
    service = AnswerService(db)
    return _get_answer_or_404(service, answer_id)


# Atualizacao de resposta
@router.put("/{answer_id}", response_model=AnswerRead)
def update_answer(
    answer_id: uuid.UUID,
    data: AnswerUpdate,
    db: Session = Depends(get_db),
):
    service = AnswerService(db)
    answer = _get_answer_or_404(service, answer_id)
    attempt = AttemptService(db).get(answer.attempt_id)
    if attempt and attempt.status == AttemptStatus.concluido:
        raise HTTPException(status_code=409, detail="Attempt already concluded.")
    return service.update(answer, data)


# Remocao de resposta
@router.delete("/{answer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_answer(answer_id: uuid.UUID, db: Session = Depends(get_db)):
    service = AnswerService(db)
    answer = _get_answer_or_404(service, answer_id)
    attempt = AttemptService(db).get(answer.attempt_id)
    if attempt and attempt.status == AttemptStatus.concluido:
        raise HTTPException(status_code=409, detail="Attempt already concluded.")
    service.delete(answer)
    return None
