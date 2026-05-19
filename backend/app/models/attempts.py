import uuid
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class AttemptStatus(str, Enum):
    in_progress = "in_progress"
    submitted = "submitted"
    graded = "graded"


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    aluno_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    visitor_name = Column(String, nullable=True)
    status = Column(String, nullable=True)
    pdf_url = Column(String, nullable=True)
    pdf_generated_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    last_saved_at = Column(DateTime(timezone=True), nullable=True)

    answers = relationship("Answer", backref="attempt", cascade="all, delete-orphan")
