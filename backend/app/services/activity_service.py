from typing import Optional
import secrets
import string
import uuid
import re

from sqlalchemy.orm import Session

from app.core.activity_state import is_activity_closed, is_activity_expired
from app.models.activities import Activity, ActivityStatus
from app.models.activity_links import ActivityLink
from app.models.attempts import Attempt
from app.models.users import RoleEnum
from app.schemas.activity import ActivityCreate, ActivityUpdate


# Compatibilidade entre Pydantic v1/v2
def _model_dump(model, **kwargs):
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)


class ActivityService:
    CODE_ALPHABET = string.ascii_uppercase + string.digits
    CODE_RE = re.compile(r"^[A-Z0-9]{3}-[A-Z0-9]{3}$")

    def __init__(self, db: Session):
        self.db = db

    def _generate_share_code(self) -> str:
        raw = "".join(secrets.choice(self.CODE_ALPHABET) for _ in range(6))
        return f"{raw[:3]}-{raw[3:]}"

    def _assert_token_format(self, token: str) -> None:
        if not self.CODE_RE.match(token):
            raise ValueError("Código gerado fora do formato esperado.")

    def _deactivate_share_links(self, activity: Activity) -> None:
        for link in activity.links or []:
            if link.is_active:
                link.is_active = False
                self.db.add(link)

    def ensure_activity_code(self, activity: Activity) -> ActivityLink:
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
            self._assert_token_format(token)
            exists = self.db.query(ActivityLink).filter(ActivityLink.token == token).first()
            if exists:
                continue
            link = ActivityLink(activity_id=activity.id, token=token, is_active=True)
            self.db.add(link)
            self.db.flush()
            return link

        raise RuntimeError("Não foi possível gerar um código único para a atividade.")

    def ensure_share_link(self, activity: Activity) -> ActivityLink:
        if activity.owner and activity.owner.role != RoleEnum.professor:
            activity.is_shareable = False
            self.db.add(activity)
        return self.ensure_activity_code(activity)

    def close_if_expired(self, activity: Activity, commit: bool = False) -> bool:
        if is_activity_expired(activity) and activity.status != ActivityStatus.encerrado:
            activity.status = ActivityStatus.encerrado
            self.db.add(activity)
            if commit:
                self.db.commit()
                self.db.refresh(activity)
            return True
        return False

    def is_closed(self, activity: Activity) -> bool:
        return is_activity_closed(activity)

    def has_reached_attempt_limit(self, activity: Activity, aluno_id: uuid.UUID) -> bool:
        max_attempts = activity.max_attempts_per_student
        if max_attempts is None:
            return False
        total = (
            self.db.query(Attempt.id)
            .filter(Attempt.activity_id == activity.id)
            .filter(Attempt.aluno_id == aluno_id)
            .count()
        )
        return total >= max_attempts

    def set_shareable(self, activity: Activity, is_shareable: bool) -> Activity:
        activity.is_shareable = is_shareable
        self.db.add(activity)
        self.db.flush()
        self.ensure_activity_code(activity)
        self.db.commit()
        self.db.refresh(activity)
        return activity

    def regenerate_share_link(self, activity: Activity) -> Activity:
        activity.is_shareable = True
        self._deactivate_share_links(activity)
        self.db.add(activity)
        self.db.flush()
        self.ensure_activity_code(activity)
        self.db.commit()
        self.db.refresh(activity)
        return activity

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
        closed_expired = False
        for activity in activities:
            closed_expired = self.close_if_expired(activity) or closed_expired
            if not activity.share_code:
                self.ensure_share_link(activity)
                created_link = True
        if created_link or closed_expired:
            self.db.commit()
            for activity in activities:
                self.db.refresh(activity)
        return activities

    # Busca atividade por id
    def get(self, activity_id: uuid.UUID) -> Optional[Activity]:
        activity = self.db.query(Activity).filter(Activity.id == activity_id).first()
        if activity:
            changed = self.close_if_expired(activity)
            if not activity.share_code:
                self.ensure_share_link(activity)
                changed = True
        if activity and changed:
            self.db.commit()
            self.db.refresh(activity)
        return activity

    # Atualiza atividade existente
    def update(self, activity: Activity, data: ActivityUpdate) -> Activity:
        updates = _model_dump(data, exclude_unset=True)
        if updates.get("status") == "ativo" and "ends_at" not in updates:
            updates["ends_at"] = None
        for field, value in updates.items():
            setattr(activity, field, value)
        self.db.add(activity)
        self.db.flush()
        self.ensure_share_link(activity)
        self.db.commit()
        self.db.refresh(activity)
        return activity

    def get_by_code(self, token: str) -> Optional[Activity]:
        link = (
            self.db.query(ActivityLink)
            .filter(ActivityLink.token == token)
            .filter(ActivityLink.is_active.is_(True))
            .first()
        )
        if not link:
            return None
        activity = link.activity
        if activity and self.close_if_expired(activity, commit=True):
            return activity
        return activity

    # Remove atividade
    def delete(self, activity: Activity) -> None:
        self.db.delete(activity)
        self.db.commit()
