from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field

from app.models.attempts import AttemptStatus

try:
    from pydantic import ConfigDict

    class ORMBase(BaseModel):
        model_config = ConfigDict(from_attributes=True)
except ImportError:
    class ORMBase(BaseModel):
        class Config:
            orm_mode = True


class AttemptBase(BaseModel):
    activity_id: uuid.UUID
    aluno_id: Optional[uuid.UUID] = None
    visitor_name: Optional[str] = Field(None, max_length=255)
    status: Optional[AttemptStatus] = None
    pdf_url: Optional[str] = Field(None, max_length=500)
    pdf_generated_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    last_saved_at: Optional[datetime] = None


class AttemptCreate(AttemptBase):
    pass


class AttemptUpdate(BaseModel):
    aluno_id: Optional[uuid.UUID] = None
    visitor_name: Optional[str] = Field(None, max_length=255)
    status: Optional[AttemptStatus] = None
    pdf_url: Optional[str] = Field(None, max_length=500)
    pdf_generated_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    last_saved_at: Optional[datetime] = None


class AttemptRead(ORMBase):
    id: uuid.UUID
    activity_id: uuid.UUID
    aluno_id: Optional[uuid.UUID] = None
    aluno_name: Optional[str] = None
    visitor_name: Optional[str] = None
    status: Optional[AttemptStatus] = None
    pdf_url: Optional[str] = None
    pdf_generated_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    last_saved_at: Optional[datetime] = None
