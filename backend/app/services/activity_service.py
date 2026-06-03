from typing import Optional
import secrets
import string
import uuid

from sqlalchemy.orm import Session

from app.models.activities import Activity
from app.models.activity_links import ActivityLink
from app.models.users import RoleEnum
from app.schemas.activity import ActivityCreate, ActivityUpdate


# Compatibilidade entre Pydantic v1/v2
def _model_dump(model, **kwargs):
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)


class ActivityService:
    CODE_ALPHABET = string.ascii_uppercase + string.digits

    def __init__(self, db: Session):
        self.db = db

    def _generate_share_code(self) -> str:
        raw = "".join(secrets.choice(self.CODE_ALPHABET) for _ in range(6))
        return f"{raw[:3]}-{raw[3:]}"

    def _can_share(self, activity: Activity) -> bool:
        return bool(
            activity.is_shareable
            and activity.owner
            and activity.owner.role == RoleEnum.professor
        )

    def _deactivate_share_links(self, activity: Activity) -> None:
        for link in activity.links or []:
            if link.is_active:
                link.is_active = False
                self.db.add(link)

    def ensure_share_link(self, activity: Activity) -> Optional[ActivityLink]:
        if not self._can_share(activity):
            if activity.owner and activity.owner.role != RoleEnum.professor:
                activity.is_shareable = False
                self.db.add(activity)
            self._deactivate_share_links(activity)
            return None

        active_link = (
            self.db.query(ActivityLink)
            .filter(ActivityLink.activity_id == activity.id)
            .filter(ActivityLink.is_active.is_(True))
            .first()
        )
        if active_link:
            return active_link

        for _ in range(20):
            token = self._generate_share_code()
            exists = self.db.query(ActivityLink).filter(ActivityLink.token == token).first()
            if exists:
                continue
            link = ActivityLink(activity_id=activity.id, token=token, is_active=True)
            self.db.add(link)
            self.db.flush()
            return link

        raise RuntimeError("Não foi possível gerar um código único para a atividade.")

    # Cria uma atividade
    def create(self, data: ActivityCreate) -> Activity:
        payload = _model_dump(data, exclude_none=True)
        activity = Activity(**payload)
        self.db.add(activity)
        self.db.flush()
        self.ensure_share_link(activity)
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
        activities = query.order_by(Activity.created_at.desc()).offset(skip).limit(limit).all()
        created_link = False
        for activity in activities:
            if activity.is_shareable and not activity.share_code:
                self.ensure_share_link(activity)
                created_link = True
        if created_link:
            self.db.commit()
            for activity in activities:
                self.db.refresh(activity)
        return activities

    # Busca atividade por id
    def get(self, activity_id: uuid.UUID) -> Optional[Activity]:
        activity = self.db.query(Activity).filter(Activity.id == activity_id).first()
        if activity and activity.is_shareable and not activity.share_code:
            self.ensure_share_link(activity)
            self.db.commit()
            self.db.refresh(activity)
        return activity

    # Atualiza atividade existente
    def update(self, activity: Activity, data: ActivityUpdate) -> Activity:
        updates = _model_dump(data, exclude_unset=True)
        for field, value in updates.items():
            setattr(activity, field, value)
        self.db.add(activity)
        self.db.flush()
        self.ensure_share_link(activity)
        self.db.commit()
        self.db.refresh(activity)
        return activity

    # Remove atividade
    def delete(self, activity: Activity) -> None:
        self.db.delete(activity)
        self.db.commit()
