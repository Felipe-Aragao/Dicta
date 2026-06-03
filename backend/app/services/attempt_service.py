from typing import Optional
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.models.activities import Activity
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

    def _with_read_relations(self, query):
        return query.options(
            selectinload(Attempt.aluno),
            selectinload(Attempt.activity).selectinload(Activity.owner),
        )

    def _recalculate_activity_total(self, activity_id: uuid.UUID) -> None:
        total = (
            self.db.query(func.count(Attempt.id))
            .filter(Attempt.activity_id == activity_id)
            .scalar()
        )
        activity = self.db.query(Activity).filter(Activity.id == activity_id).first()
        if activity:
            activity.total_responses = int(total or 0)
            self.db.add(activity)

    # Cria uma tentativa
    def create(self, data: AttemptCreate) -> Attempt:
        payload = _model_dump(data, exclude_none=True)
        attempt = Attempt(**payload)
        self.db.add(attempt)
        self.db.flush()
        self._recalculate_activity_total(attempt.activity_id)
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
        query = self._with_read_relations(self.db.query(Attempt))
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
            self._with_read_relations(self.db.query(Attempt))
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
        activity_id = attempt.activity_id
        self.db.delete(attempt)
        self.db.flush()
        self._recalculate_activity_total(activity_id)
        self.db.commit()
