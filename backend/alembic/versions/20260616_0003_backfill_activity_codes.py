"""Backfill activity codes for all activities.

Revision ID: 20260616_0003
Revises: 20260615_0002
Create Date: 2026-06-16
"""

from alembic import op


revision = "20260616_0003"
down_revision = "20260615_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO activity_links (id, activity_id, token, is_active)
        SELECT
            (
                SUBSTRING(MD5('activity-link:' || missing.id::text), 1, 8)
                || '-'
                || SUBSTRING(MD5('activity-link:' || missing.id::text), 9, 4)
                || '-'
                || SUBSTRING(MD5('activity-link:' || missing.id::text), 13, 4)
                || '-'
                || SUBSTRING(MD5('activity-link:' || missing.id::text), 17, 4)
                || '-'
                || SUBSTRING(MD5('activity-link:' || missing.id::text), 21, 12)
            )::uuid,
            missing.id,
            candidate.token,
            TRUE
        FROM (
            SELECT a.id
            FROM activities a
            WHERE NOT EXISTS (
                SELECT 1
                FROM activity_links l
                WHERE l.activity_id = a.id
                  AND l.is_active IS TRUE
            )
        ) AS missing
        CROSS JOIN LATERAL (
            SELECT
                UPPER(
                    SUBSTRING(MD5(missing.id::text || ':' || gs::text), 1, 3)
                    || '-'
                    || SUBSTRING(MD5(missing.id::text || ':' || gs::text), 4, 3)
                ) AS token
            FROM generate_series(0, 100) AS gs
            WHERE NOT EXISTS (
                SELECT 1
                FROM activity_links existing
                WHERE existing.token = UPPER(
                    SUBSTRING(MD5(missing.id::text || ':' || gs::text), 1, 3)
                    || '-'
                    || SUBSTRING(MD5(missing.id::text || ':' || gs::text), 4, 3)
                )
            )
            ORDER BY gs
            LIMIT 1
        ) AS candidate
        """
    )


def downgrade() -> None:
    pass
