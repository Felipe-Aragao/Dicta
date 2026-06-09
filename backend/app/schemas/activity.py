from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field

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
    published_at: Optional[datetime] = None


class ActivityCreate(ActivityBase):
    owner_id: Optional[uuid.UUID] = None


class ActivityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    discipline: Optional[str] = Field(None, max_length=255)
    status: Optional[ActivityStatus] = None
    is_shareable: Optional[bool] = None
    published_at: Optional[datetime] = None


class ActivityShareUpdate(BaseModel):
    is_shareable: bool


class ActivityRead(ORMBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    name: str
    discipline: Optional[str] = None
    status: ActivityStatus
    is_shareable: bool
    total_responses: int
    share_code: Optional[str] = None
    created_at: datetime
    published_at: Optional[datetime] = None
