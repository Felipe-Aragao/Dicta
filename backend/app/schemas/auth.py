from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, EmailStr, Field

from app.models.users import RoleEnum

try:
    from pydantic import ConfigDict

    class ORMBase(BaseModel):
        model_config = ConfigDict(from_attributes=True)
except ImportError:
    class ORMBase(BaseModel):
        class Config:
            orm_mode = True


class RegisterRequest(BaseModel):
    role: RoleEnum
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=255)
    role: Optional[RoleEnum] = None


class AuthUserRead(ORMBase):
    id: uuid.UUID
    role: RoleEnum
    name: str
    email: EmailStr
    created_at: datetime
    updated_at: Optional[datetime] = None


class AuthTokenRead(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUserRead
