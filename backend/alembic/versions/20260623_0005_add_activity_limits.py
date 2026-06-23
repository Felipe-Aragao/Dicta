"""add activity attempt and date limits

Revision ID: 20260623_0005
Revises: 20260617_0004
Create Date: 2026-06-23
"""

from alembic import op
import sqlalchemy as sa


revision = "20260623_0005"
down_revision = "20260617_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("activities", sa.Column("max_attempts_per_student", sa.Integer(), nullable=True))
    op.add_column("activities", sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True))
    op.create_check_constraint(
        "activities_max_attempts_positive",
        "activities",
        "max_attempts_per_student IS NULL OR max_attempts_per_student > 0",
    )


def downgrade() -> None:
    op.drop_constraint("activities_max_attempts_positive", "activities", type_="check")
    op.drop_column("activities", "ends_at")
    op.drop_column("activities", "max_attempts_per_student")
