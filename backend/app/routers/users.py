from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


def _get_user_or_404(service: UserService, user_id: uuid.UUID):
    user = service.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    service = UserService(db)
    existing = service.get_by_email(str(data.email))
    if existing:
        raise HTTPException(status_code=409, detail="Email already in use.")
    return service.create(data)


@router.get("", response_model=List[UserRead])
def list_users(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    return UserService(db).list(skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    service = UserService(db)
    return _get_user_or_404(service, user_id)


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    db: Session = Depends(get_db),
):
    service = UserService(db)
    user = _get_user_or_404(service, user_id)

    if data.email:
        existing = service.get_by_email(str(data.email))
        if existing and existing.id != user.id:
            raise HTTPException(status_code=409, detail="Email already in use.")

    return service.update(user, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    service = UserService(db)
    user = _get_user_or_404(service, user_id)
    service.delete(user)
    return None
