from typing import Optional
import uuid

from sqlalchemy.orm import Session, selectinload

from app.models.answers import Answer
from app.schemas.answer import AnswerCreate, AnswerUpdate


# Compatibilidade entre Pydantic v1/v2
def _model_dump(model, **kwargs):
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)


class AnswerService:
    def __init__(self, db: Session):
        self.db = db

    # Cria uma resposta
    def create(self, data: AnswerCreate) -> Answer:
        payload = _model_dump(data, exclude_none=True)
        answer = Answer(**payload)
        self.db.add(answer)
        self.db.commit()
        self.db.refresh(answer)
        return answer

    # Lista respostas com filtros
    def list(
        self,
        attempt_id: Optional[uuid.UUID] = None,
        question_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Answer]:
        query = self.db.query(Answer).options(selectinload(Answer.question))
        if attempt_id:
            query = query.filter(Answer.attempt_id == attempt_id)
        if question_id:
            query = query.filter(Answer.question_id == question_id)
        return (
            query.order_by(Answer.answered_at.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    # Busca resposta por id
    def get(self, answer_id: uuid.UUID) -> Optional[Answer]:
        return (
            self.db.query(Answer)
            .options(selectinload(Answer.question))
            .filter(Answer.id == answer_id)
            .first()
        )

    # Atualiza resposta existente
    def update(self, answer: Answer, data: AnswerUpdate) -> Answer:
        updates = _model_dump(data, exclude_unset=True)
        for field, value in updates.items():
            setattr(answer, field, value)
        self.db.add(answer)
        self.db.commit()
        self.db.refresh(answer)
        return answer

    # Remove resposta
    def delete(self, answer: Answer) -> None:
        self.db.delete(answer)
        self.db.commit()
