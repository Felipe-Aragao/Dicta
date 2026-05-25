from datetime import datetime
from typing import List, Optional
import uuid

from pydantic import BaseModel, Field

from app.schemas.question_option import QuestionOptionRead

try:
    from pydantic import ConfigDict

    class ORMBase(BaseModel):
        model_config = ConfigDict(from_attributes=True)
except ImportError:
    class ORMBase(BaseModel):
        class Config:
            orm_mode = True


class QuestionBase(BaseModel):
    activity_id: uuid.UUID
    position: Optional[int] = None
    type: Optional[str] = Field(None, max_length=32)
    prompt: str = Field(..., min_length=1)


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    position: Optional[int] = None
    type: Optional[str] = Field(None, max_length=32)
    prompt: Optional[str] = Field(None, min_length=1)


class QuestionRead(ORMBase):
    id: uuid.UUID
    activity_id: uuid.UUID
    position: Optional[int] = None
    type: Optional[str] = None
    prompt: str
    created_at: datetime
    options: List[QuestionOptionRead] = []
