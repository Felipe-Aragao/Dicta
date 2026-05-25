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


class QuestionOptionBase(BaseModel):
    question_id: uuid.UUID
    letter: str = Field(..., min_length=1, max_length=1)
    text: str = Field(..., min_length=1)


class QuestionOptionCreate(QuestionOptionBase):
    pass


class QuestionOptionUpdate(BaseModel):
    letter: Optional[str] = Field(None, min_length=1, max_length=1)
    text: Optional[str] = Field(None, min_length=1)


class QuestionOptionRead(ORMBase):
    id: uuid.UUID
    question_id: uuid.UUID
    letter: str
    text: str
