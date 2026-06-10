from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.authorization import ensure_question_owner_access
from app.core.database import get_db
from app.core.security import AuthContext, get_auth_context
from app.schemas.question_option import (
    QuestionOptionCreate,
    QuestionOptionRead,
)
from app.services.question_option_service import QuestionOptionService
from app.services.question_service import QuestionService

router = APIRouter(prefix="/question-options", tags=["question-options"])


# Criacao de opcao
@router.post("", response_model=QuestionOptionRead, status_code=status.HTTP_201_CREATED)
def create_option(
    data: QuestionOptionCreate,
    db: Session = Depends(get_db),
    context: AuthContext = Depends(get_auth_context),
):
    question = QuestionService(db).get(data.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")
    ensure_question_owner_access(db, context, question)
    return QuestionOptionService(db).create(data)


