from datetime import datetime
from typing import Optional
import uuid

from pydantic import BaseModel, Field

try:
    from pydantic import ConfigDict

    class ORMBase(BaseModel):
        model_config = ConfigDict(from_attributes=True)
except ImportError:
    class ORMBase(BaseModel):
        class Config:
            orm_mode = True


class AnswerBase(BaseModel):
    attempt_id: uuid.UUID
    question_id: uuid.UUID
    response_text: Optional[str] = None
    chosen_letter: Optional[str] = Field(None, min_length=1, max_length=1)


class AnswerCreate(AnswerBase):
    pass


class AnswerUpdate(BaseModel):
    response_text: Optional[str] = None
    chosen_letter: Optional[str] = Field(None, min_length=1, max_length=1)


class AnswerRead(ORMBase):
    id: uuid.UUID
    attempt_id: uuid.UUID
    question_id: uuid.UUID
    response_text: Optional[str] = None
    chosen_letter: Optional[str] = None
    answered_at: datetime
    updated_at: Optional[datetime] = None
    question_prompt: Optional[str] = None
    question_type: Optional[str] = None
