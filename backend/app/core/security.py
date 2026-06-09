from datetime import datetime, timedelta, timezone
import os
import uuid
from typing import Any

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.user_service import UserService

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY não configurada. Defina a variável no arquivo .env do backend.")
if JWT_ALGORITHM != "HS256":
    raise RuntimeError("JWT_ALGORITHM inválido. Apenas HS256.")

bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(subject: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except (ExpiredSignatureError, InvalidTokenError):
        raise credentials_exception

    if not payload.get("sub") or not payload.get("role"):
        raise credentials_exception

    return payload


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais de autenticação ausentes.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = UserService(db).get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário autenticado não encontrado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
