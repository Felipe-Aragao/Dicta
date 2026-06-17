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


class UserBase(BaseModel):
    role: Optional[RoleEnum] = None
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password_hash: Optional[str] = Field(None, max_length=255)
    profile_image_url: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    role: Optional[RoleEnum] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    password_hash: Optional[str] = Field(None, max_length=255)
    profile_image_url: Optional[str] = None


class UserRead(ORMBase):
    id: uuid.UUID
    role: RoleEnum
    name: str
    email: EmailStr
    profile_image_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
