from typing import Optional
import uuid

from sqlalchemy.orm import Session, selectinload

from app.models.questions import Question
from app.schemas.question import QuestionCreate, QuestionUpdate


# Compatibilidade entre Pydantic v1/v2
def _model_dump(model, **kwargs):
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)


class QuestionService:
    def __init__(self, db: Session):
        self.db = db

    # Cria uma questao
    def create(self, data: QuestionCreate) -> Question:
        payload = _model_dump(data, exclude_none=True)
        question = Question(**payload)
        self.db.add(question)
        self.db.commit()
        self.db.refresh(question)
        return question

    # Lista questoes com filtros
    def list(
        self,
        activity_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Question]:
        query = self.db.query(Question).options(selectinload(Question.options))
        if activity_id:
            query = query.filter(Question.activity_id == activity_id)
        return query.order_by(Question.position.asc(), Question.created_at.asc()).offset(skip).limit(limit).all()

    # Busca questao por id
    def get(self, question_id: uuid.UUID) -> Optional[Question]:
        return (
            self.db.query(Question)
            .options(selectinload(Question.options))
            .filter(Question.id == question_id)
            .first()
        )

    # Atualiza questao existente
    def update(self, question: Question, data: QuestionUpdate) -> Question:
        updates = _model_dump(data, exclude_unset=True)
        for field, value in updates.items():
            setattr(question, field, value)
        self.db.add(question)
        self.db.commit()
        self.db.refresh(question)
        return question

    # Remove questao
    def delete(self, question: Question) -> None:
        self.db.delete(question)
        self.db.commit()
