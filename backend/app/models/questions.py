import enum
import uuid
from sqlalchemy import CheckConstraint, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class QuestionType(str, enum.Enum):
    open = "open"
    multiple = "multiple"


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (
        CheckConstraint("type IN ('open', 'multiple')", name="questions_type_valid"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, nullable=True)
    type = Column(String(32), nullable=False, default=QuestionType.open.value)
    prompt = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    options = relationship("QuestionOption", backref="question", cascade="all, delete-orphan")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")
