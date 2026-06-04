import enum
import uuid
from sqlalchemy import Column, String, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class AttemptStatus(str, enum.Enum):
    em_progresso = "em progresso"
    concluido = "concluido"


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    aluno_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    visitor_name = Column(String, nullable=True)
    status = Column(SAEnum(AttemptStatus), default=AttemptStatus.em_progresso, nullable=False)
    pdf_url = Column(String, nullable=True)
    pdf_generated_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    last_saved_at = Column(DateTime(timezone=True), nullable=True)

    answers = relationship("Answer", backref="attempt", cascade="all, delete-orphan")
    aluno = relationship("User", backref="attempts")

    @property
    def aluno_name(self):
        return self.aluno.name if self.aluno else None

    @property
    def activity_name(self):
        return self.activity.name if self.activity else None

    @property
    def activity_discipline(self):
        return self.activity.discipline if self.activity else None

    @property
    def professor_name(self):
        if not self.activity or not self.activity.owner:
            return None
        return self.activity.owner.name
