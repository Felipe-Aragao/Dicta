from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.schemas.auth import AuthTokenRead, AuthUserRead, LoginRequest, RegisterRequest
from app.schemas.user import UserCreate
from app.services.auth_service import hash_password, verify_password
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_response(user) -> dict:
    return {
        "access_token": create_access_token(subject=str(user.id), role=user.role.value),
        "token_type": "bearer",
        "user": user,
    }


# Registro de usuario
@router.post("/register", response_model=AuthTokenRead, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    service = UserService(db)
    existing = service.get_by_email(str(data.email))
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Email já cadastrado",
        )

    user = service.create(
        UserCreate(
            role=data.role,
            name=data.name,
            email=data.email,
            password_hash=hash_password(data.password),
        )
    )
    return _auth_response(user)


# Login de usuario
@router.post("/login", response_model=AuthTokenRead)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    service = UserService(db)
    user = service.get_by_email(str(data.email))
    if not user or not verify_password(user.password_hash, data.password):
        raise HTTPException(status_code=401, detail="Email ou senha inválidos.")
    if data.role and user.role != data.role:
        raise HTTPException(status_code=403, detail="Email ou senha inválidos.")
    return _auth_response(user)


@router.get("/me", response_model=AuthUserRead)
def me(current_user=Depends(get_current_user)):
    return current_user
