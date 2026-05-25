from typing import Optional
import uuid

from sqlalchemy.orm import Session, selectinload

from app.models.attempts import Attempt
from app.schemas.attempt import AttemptCreate, AttemptUpdate


# Compatibilidade entre Pydantic v1/v2
def _model_dump(model, **kwargs):
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)


class AttemptService:
    def __init__(self, db: Session):
        self.db = db

    # Cria uma tentativa
    def create(self, data: AttemptCreate) -> Attempt:
        payload = _model_dump(data, exclude_none=True)
        attempt = Attempt(**payload)
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)
        return attempt

    # Lista tentativas com filtros
    def list(
        self,
        activity_id: Optional[uuid.UUID] = None,
        aluno_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Attempt]:
        query = self.db.query(Attempt).options(selectinload(Attempt.aluno))
        if activity_id:
            query = query.filter(Attempt.activity_id == activity_id)
        if aluno_id:
            query = query.filter(Attempt.aluno_id == aluno_id)
        return (
            query.order_by(Attempt.started_at.desc(), Attempt.submitted_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    # Busca tentativa por id
    def get(self, attempt_id: uuid.UUID) -> Optional[Attempt]:
        return (
            self.db.query(Attempt)
            .options(selectinload(Attempt.aluno))
            .filter(Attempt.id == attempt_id)
            .first()
        )

    # Atualiza tentativa existente
    def update(self, attempt: Attempt, data: AttemptUpdate) -> Attempt:
        updates = _model_dump(data, exclude_unset=True)
        for field, value in updates.items():
            setattr(attempt, field, value)
        self.db.add(attempt)
        self.db.commit()
        self.db.refresh(attempt)
        return attempt

    # Remove tentativa
    def delete(self, attempt: Attempt) -> None:
        self.db.delete(attempt)
        self.db.commit()
