from datetime import datetime, timezone
from typing import Optional
import uuid

from pydantic import BaseModel, Field, validator

from app.models.activities import ActivityStatus

try:
    from pydantic import ConfigDict

    class ORMBase(BaseModel):
        model_config = ConfigDict(from_attributes=True)
except ImportError:
    class ORMBase(BaseModel):
        class Config:
            orm_mode = True


class ActivityBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    discipline: Optional[str] = Field(None, max_length=255)
    status: Optional[ActivityStatus] = None
    is_shareable: Optional[bool] = None
    max_attempts_per_student: Optional[int] = Field(None, gt=0)
    published_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None

    @validator("ends_at")
    def ends_at_must_be_future(cls, value):
        if value is None:
            return value
        current_time = datetime.now(timezone.utc)
        normalized = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if normalized <= current_time:
            raise ValueError("A data de encerramento deve ser futura.")
        return value


class ActivityCreate(ActivityBase):
    owner_id: Optional[uuid.UUID] = None


class ActivityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    discipline: Optional[str] = Field(None, max_length=255)
    status: Optional[ActivityStatus] = None
    is_shareable: Optional[bool] = None
    max_attempts_per_student: Optional[int] = Field(None, gt=0)
    published_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None

    @validator("ends_at")
    def ends_at_must_be_future(cls, value):
        if value is None:
            return value
        current_time = datetime.now(timezone.utc)
        normalized = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if normalized <= current_time:
            raise ValueError("A data de encerramento deve ser futura.")
        return value


class ActivityShareUpdate(BaseModel):
    is_shareable: bool


class ActivityRead(ORMBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    discipline: Optional[str] = None
    status: ActivityStatus
    is_shareable: bool
    max_attempts_per_student: Optional[int] = None
    total_responses: int
    share_code: Optional[str] = None
    created_at: datetime
    published_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
