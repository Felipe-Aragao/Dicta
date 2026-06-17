"""add user profile image

Revision ID: 20260617_0004
Revises: 20260616_0003
Create Date: 2026-06-17
"""

from alembic import op
import sqlalchemy as sa


revision = "20260617_0004"
down_revision = "20260616_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_image_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_image_url")
