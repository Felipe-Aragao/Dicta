from typing import Optional
import uuid

from sqlalchemy.orm import Session

from app.models.activities import Activity
from app.schemas.activity import ActivityCreate, ActivityUpdate


# Compatibilidade entre Pydantic v1/v2
def _model_dump(model, **kwargs):
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)


class ActivityService:
    def __init__(self, db: Session):
        self.db = db

    # Cria uma atividade
    def create(self, data: ActivityCreate) -> Activity:
        payload = _model_dump(data, exclude_none=True)
        activity = Activity(**payload)
        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)
        return activity

    # Lista atividades com filtros
    def list(
        self,
        owner_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Activity]:
        query = self.db.query(Activity)
        if owner_id:
            query = query.filter(Activity.owner_id == owner_id)
        return query.order_by(Activity.created_at.desc()).offset(skip).limit(limit).all()

    # Busca atividade por id
    def get(self, activity_id: uuid.UUID) -> Optional[Activity]:
        return self.db.query(Activity).filter(Activity.id == activity_id).first()

    # Atualiza atividade existente
    def update(self, activity: Activity, data: ActivityUpdate) -> Activity:
        updates = _model_dump(data, exclude_unset=True)
        for field, value in updates.items():
            setattr(activity, field, value)
        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)
        return activity

    # Remove atividade
    def delete(self, activity: Activity) -> None:
        self.db.delete(activity)
        self.db.commit()
