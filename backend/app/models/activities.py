import enum
import uuid
from sqlalchemy import CheckConstraint, Column, String, Boolean, Integer, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.core.database import Base


class ActivityStatus(str, enum.Enum):
    ativo = "ativo"
    encerrado = "encerrado"
    rascunho = "rascunho"


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        CheckConstraint("total_responses >= 0", name="activities_total_responses_nonnegative"),
        CheckConstraint(
            "max_attempts_per_student IS NULL OR max_attempts_per_student > 0",
            name="activities_max_attempts_positive",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    discipline = Column(String, nullable=True)
    status = Column(Enum(ActivityStatus), default=ActivityStatus.rascunho, nullable=False)
    is_shareable = Column(Boolean, default=False, nullable=False)
    total_responses = Column(Integer, default=0, nullable=False)
    max_attempts_per_student = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)

    owner = relationship("User", backref="activities")
    questions = relationship("Question", backref="activity", cascade="all, delete-orphan")
    links = relationship("ActivityLink", backref="activity", cascade="all, delete-orphan")
    attempts = relationship("Attempt", backref="activity", cascade="all, delete-orphan")

    @property
    def share_code(self):
        for link in self.links or []:
            if link.is_active:
                return link.token
        return None
