from datetime import datetime
from typing import List, Optional
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
    activity_name: Optional[str] = None
    activity_discipline: Optional[str] = None
    activity_share_code: Optional[str] = None
    professor_name: Optional[str] = None
    visitor_name: Optional[str] = None
    status: Optional[AttemptStatus] = None
    pdf_url: Optional[str] = None
    pdf_generated_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    last_saved_at: Optional[datetime] = None


class VisitorQuestionInput(BaseModel):
    prompt: str = Field(..., min_length=1)
    type: Optional[str] = Field(None, max_length=32)
    position: Optional[int] = None
    options: Optional[List[str]] = None


class VisitorAttemptCreate(BaseModel):
    visitor_name: str = Field(..., min_length=1, max_length=255)
    activity_name: Optional[str] = Field(None, max_length=255)
    questions: List[VisitorQuestionInput] = Field(..., min_items=1)


class VisitorAttemptRead(BaseModel):
    access_token: str
    token_type: str = "bearer"
    attempt: AttemptRead
    questions: List["QuestionRead"]
    expires_at: datetime


from app.schemas.question import QuestionRead  # noqa: E402
