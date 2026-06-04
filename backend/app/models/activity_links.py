import uuid
from sqlalchemy import CheckConstraint, Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import validates

from app.core.database import Base


class ActivityLink(Base):
    __tablename__ = "activity_links"
    __table_args__ = (
        CheckConstraint(
            "token ~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$'",
            name="activity_links_token_format",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("activities.id"), nullable=False)
    token = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    @validates("token")
    def validate_token(self, key, value):
        import re

        if not value or not re.fullmatch(r"[A-Z0-9]{3}-[A-Z0-9]{3}", value):
            raise ValueError("Token deve estar no formato XXX-XXX.")
        return value
