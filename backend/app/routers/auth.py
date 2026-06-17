from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.models.users import RoleEnum
from app.schemas.auth import AuthTokenRead, AuthUserRead, LoginRequest, ProfileUpdateRequest, RegisterRequest
from app.schemas.user import UserCreate, UserUpdate
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
    if data.role not in {RoleEnum.aluno, RoleEnum.professor}:
        raise HTTPException(status_code=400, detail="Perfil de cadastro inválido.")

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


@router.patch("/me", response_model=AuthUserRead)
def update_me(
    data: ProfileUpdateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fields_set = getattr(data, "model_fields_set", getattr(data, "__fields_set__", set()))
    updates = {}
    if "name" in fields_set and data.name is not None:
        name = data.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Nome não pode ser vazio.")
        updates["name"] = name
    if "profile_image_url" in fields_set:
        updates["profile_image_url"] = data.profile_image_url
    return UserService(db).update(current_user, UserUpdate(**updates))


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    UserService(db).delete_account(current_user)
    return None
