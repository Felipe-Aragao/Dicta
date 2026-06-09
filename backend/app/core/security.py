from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
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


@dataclass(frozen=True)
class AuthContext:
    kind: str
    user: Any | None = None
    visitor_attempt_id: uuid.UUID | None = None
    visitor_activity_id: uuid.UUID | None = None


def create_access_token(subject: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_visitor_attempt_token(
    attempt_id: uuid.UUID,
    activity_id: uuid.UUID,
    expires_at: datetime,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "type": "visitor_attempt",
        "attempt_id": str(attempt_id),
        "activity_id": str(activity_id),
        "iat": now,
        "exp": expires_at,
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

    is_visitor = payload.get("type") == "visitor_attempt"
    is_user = payload.get("sub") and payload.get("role")
    if not is_visitor and not is_user:
        raise credentials_exception

    return payload


def get_auth_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AuthContext:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais de autenticação ausentes.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if payload.get("type") == "visitor_attempt":
        try:
            return AuthContext(
                kind="visitor",
                visitor_attempt_id=uuid.UUID(payload["attempt_id"]),
                visitor_activity_id=uuid.UUID(payload["activity_id"]),
            )
        except (KeyError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido ou expirado.",
                headers={"WWW-Authenticate": "Bearer"},
            )

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
    return AuthContext(kind="user", user=user)


def get_current_user(context: AuthContext = Depends(get_auth_context)):
    if context.kind != "user" or not context.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais de usuário ausentes.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return context.user
