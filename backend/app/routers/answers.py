from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.authorization import (
    ensure_answer_write_access,
    ensure_attempt_access,
    ensure_attempt_write_access,
)
from app.core.database import get_db
from app.core.security import AuthContext, get_auth_context
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
        raise HTTPException(status_code=404, detail="Resposta não encontrada.")
    return answer


# Criacao de resposta
@router.post("", response_model=AnswerRead, status_code=status.HTTP_201_CREATED)
def create_answer(
    data: AnswerCreate,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    attempt = AttemptService(db).get(data.attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa não encontrada.")
    ensure_attempt_access(db, context, attempt)
    ensure_attempt_write_access(context, attempt)
    if attempt.status == AttemptStatus.concluido:
        raise HTTPException(status_code=409, detail="Tentativa já concluída.")

    question = QuestionService(db).get(data.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")
    if question.activity_id != attempt.activity_id:
        raise HTTPException(status_code=400, detail="Questão não pertence à atividade da tentativa.")

    return AnswerService(db).create(data)


# Listagem de respostas
@router.get("", response_model=List[AnswerRead])
def list_answers(
    attempt_id: Optional[uuid.UUID] = None,
    question_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    if attempt_id:
        attempt = AttemptService(db).get(attempt_id)
        if not attempt:
            raise HTTPException(status_code=404, detail="Tentativa não encontrada.")
        ensure_attempt_access(db, context, attempt)
    elif context.kind == "visitor":
        attempt_id = context.visitor_attempt_id
    else:
        raise HTTPException(status_code=400, detail="attempt_id é obrigatório.")

    return AnswerService(db).list(
        attempt_id=attempt_id,
        question_id=question_id,
        skip=skip,
        limit=limit,
    )


# Atualizacao de resposta
@router.put("/{answer_id}", response_model=AnswerRead)
def update_answer(
    answer_id: uuid.UUID,
    data: AnswerUpdate,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    service = AnswerService(db)
    answer = _get_answer_or_404(service, answer_id)
    ensure_answer_write_access(db, context, answer)
    attempt = AttemptService(db).get(answer.attempt_id)
    if attempt and attempt.status == AttemptStatus.concluido:
        raise HTTPException(status_code=409, detail="Tentativa já concluída.")
    return service.update(answer, data)


