import enum
import uuid
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Enum, ForeignKey
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    discipline = Column(String, nullable=True)
    status = Column(Enum(ActivityStatus), default=ActivityStatus.rascunho)
    is_shareable = Column(Boolean, default=False)
    total_responses = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)

    owner = relationship("User", backref="activities")
    questions = relationship("Question", backref="activity", cascade="all, delete-orphan")
    links = relationship("ActivityLink", backref="activity", cascade="all, delete-orphan")
