from typing import Optional
import uuid

from sqlalchemy.orm import Session

from app.models.activities import Activity
from app.models.attempts import Attempt
from app.models.users import User
from app.schemas.user import UserCreate, UserUpdate


# Compatibilidade entre Pydantic v1/v2
def _model_dump(model, **kwargs):
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)


class UserService:
    def __init__(self, db: Session):
        self.db = db

    # Cria um usuario
    def create(self, data: UserCreate) -> User:
        payload = _model_dump(data, exclude_none=True)
        user = User(**payload)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    # Lista usuarios com paginacao
    def list(self, skip: int = 0, limit: int = 20) -> list[User]:
        return self.db.query(User).order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    # Busca usuario por id
    def get(self, user_id: uuid.UUID) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    # Busca usuario por email
    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    # Atualiza usuario existente
    def update(self, user: User, data: UserUpdate) -> User:
        updates = _model_dump(data, exclude_unset=True)
        for field, value in updates.items():
            setattr(user, field, value)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    # Remove usuario
    def delete(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()

    # Remove a propria conta e dados dependentes que pertencem ao usuario
    def delete_account(self, user: User) -> None:
        self.db.query(Attempt).filter(Attempt.aluno_id == user.id).delete(synchronize_session=False)
        self.db.query(Activity).filter(Activity.owner_id == user.id).delete(synchronize_session=False)
        self.db.delete(user)
        self.db.commit()
