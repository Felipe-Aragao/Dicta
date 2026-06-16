import uuid
from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class Answer(Base):
    __tablename__ = "answers"
    __table_args__ = (
        CheckConstraint(
            "response_text IS NOT NULL OR chosen_letter IS NOT NULL",
            name="answers_has_response",
        ),
        ForeignKeyConstraint(
            ["question_id", "chosen_letter"],
            ["question_options.question_id", "question_options.letter"],
            name="fk_answers_question_option_letter",
        ),
        UniqueConstraint("attempt_id", "question_id", name="uq_answers_attempt_question"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id = Column(UUID(as_uuid=True), ForeignKey("attempts.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    response_text = Column(Text, nullable=True)
    chosen_letter = Column(String(1), nullable=True)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    question = relationship("Question", backref="answers_rel")

    @property
    def question_prompt(self):
        return self.question.prompt if self.question else None

    @property
    def question_type(self):
        return self.question.type if self.question else None
