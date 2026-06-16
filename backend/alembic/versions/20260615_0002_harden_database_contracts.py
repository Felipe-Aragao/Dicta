"""harden database contracts

Revision ID: 20260615_0002
Revises: 20260608_0001
Create Date: 2026-06-15 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20260615_0002"
down_revision: Union[str, Sequence[str], None] = "20260608_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'sistema'")

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = 'attemptstatus'
                  AND e.enumlabel = 'em_progresso'
            ) THEN
                ALTER TYPE attemptstatus RENAME VALUE 'em_progresso' TO 'em progresso';
            END IF;
        END
        $$;
        """
    )

    op.execute("UPDATE users SET role = 'sistema' WHERE email = 'visitante@dicta.app'")
    op.execute("UPDATE activities SET status = 'rascunho' WHERE status IS NULL")
    op.execute("UPDATE activities SET is_shareable = false WHERE is_shareable IS NULL")
    op.execute("UPDATE activities SET total_responses = 0 WHERE total_responses IS NULL")
    op.execute("UPDATE questions SET type = 'open' WHERE type IS NULL OR type NOT IN ('open', 'multiple')")
    op.execute("UPDATE answers SET response_text = '' WHERE response_text IS NULL AND chosen_letter IS NULL")
    op.execute(
        """
        DELETE FROM answers a
        USING answers kept
        WHERE a.attempt_id = kept.attempt_id
          AND a.question_id = kept.question_id
          AND a.id > kept.id
        """
    )
    op.execute(
        """
        DELETE FROM question_options o
        USING question_options kept
        WHERE o.question_id = kept.question_id
          AND o.letter = kept.letter
          AND o.id > kept.id
        """
    )
    op.execute(
        """
        UPDATE answers a
        SET chosen_letter = NULL
        WHERE chosen_letter IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM question_options o
              WHERE o.question_id = a.question_id
                AND o.letter = a.chosen_letter
          )
        """
    )
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                row_number() OVER (
                    PARTITION BY activity_id
                    ORDER BY created_at DESC NULLS LAST, id DESC
                ) AS rn
            FROM activity_links
            WHERE is_active IS TRUE
        )
        UPDATE activity_links
        SET is_active = false
        WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
        """
    )

    op.alter_column("activities", "status", nullable=False)
    op.alter_column("activities", "is_shareable", nullable=False)
    op.alter_column("activities", "total_responses", nullable=False)
    op.alter_column("questions", "type", existing_type=sa.String(), type_=sa.String(length=32), nullable=False)

    op.create_check_constraint(
        "activities_total_responses_nonnegative",
        "activities",
        "total_responses >= 0",
    )
    op.create_check_constraint(
        "attempts_has_user_or_visitor",
        "attempts",
        "aluno_id IS NOT NULL OR (visitor_name IS NOT NULL AND btrim(visitor_name) <> '')",
    )
    op.create_check_constraint(
        "questions_type_valid",
        "questions",
        "type IN ('open', 'multiple')",
    )
    op.create_check_constraint(
        "answers_has_response",
        "answers",
        "response_text IS NOT NULL OR chosen_letter IS NOT NULL",
    )

    op.create_unique_constraint(
        "uq_question_options_question_letter",
        "question_options",
        ["question_id", "letter"],
    )
    op.create_unique_constraint(
        "uq_answers_attempt_question",
        "answers",
        ["attempt_id", "question_id"],
    )
    op.create_foreign_key(
        "fk_answers_question_option_letter",
        "answers",
        "question_options",
        ["question_id", "chosen_letter"],
        ["question_id", "letter"],
    )
    op.create_index(
        "uq_activity_links_one_active_per_activity",
        "activity_links",
        ["activity_id"],
        unique=True,
        postgresql_where=sa.text("is_active IS TRUE"),
    )

    _replace_fk("activity_links_activity_id_fkey", "activity_links", "activities", ["activity_id"], ["id"], "CASCADE")
    _replace_fk("attempts_activity_id_fkey", "attempts", "activities", ["activity_id"], ["id"], "CASCADE")
    _replace_fk("attempts_aluno_id_fkey", "attempts", "users", ["aluno_id"], ["id"], "SET NULL")
    _replace_fk("questions_activity_id_fkey", "questions", "activities", ["activity_id"], ["id"], "CASCADE")
    _replace_fk("answers_attempt_id_fkey", "answers", "attempts", ["attempt_id"], ["id"], "CASCADE")
    _replace_fk("answers_question_id_fkey", "answers", "questions", ["question_id"], ["id"], "CASCADE")
    _replace_fk("question_options_question_id_fkey", "question_options", "questions", ["question_id"], ["id"], "CASCADE")


def downgrade() -> None:
    op.drop_constraint("question_options_question_id_fkey", "question_options", type_="foreignkey")
    op.create_foreign_key(
        "question_options_question_id_fkey",
        "question_options",
        "questions",
        ["question_id"],
        ["id"],
    )
    op.drop_constraint("answers_question_id_fkey", "answers", type_="foreignkey")
    op.create_foreign_key("answers_question_id_fkey", "answers", "questions", ["question_id"], ["id"])
    op.drop_constraint("answers_attempt_id_fkey", "answers", type_="foreignkey")
    op.create_foreign_key("answers_attempt_id_fkey", "answers", "attempts", ["attempt_id"], ["id"])
    op.drop_constraint("questions_activity_id_fkey", "questions", type_="foreignkey")
    op.create_foreign_key("questions_activity_id_fkey", "questions", "activities", ["activity_id"], ["id"])
    op.drop_constraint("attempts_aluno_id_fkey", "attempts", type_="foreignkey")
    op.create_foreign_key("attempts_aluno_id_fkey", "attempts", "users", ["aluno_id"], ["id"])
    op.drop_constraint("attempts_activity_id_fkey", "attempts", type_="foreignkey")
    op.create_foreign_key("attempts_activity_id_fkey", "attempts", "activities", ["activity_id"], ["id"])
    op.drop_constraint("activity_links_activity_id_fkey", "activity_links", type_="foreignkey")
    op.create_foreign_key("activity_links_activity_id_fkey", "activity_links", "activities", ["activity_id"], ["id"])

    op.drop_index("uq_activity_links_one_active_per_activity", table_name="activity_links")
    op.drop_constraint("fk_answers_question_option_letter", "answers", type_="foreignkey")
    op.drop_constraint("uq_answers_attempt_question", "answers", type_="unique")
    op.drop_constraint("uq_question_options_question_letter", "question_options", type_="unique")
    op.drop_constraint("answers_has_response", "answers", type_="check")
    op.drop_constraint("questions_type_valid", "questions", type_="check")
    op.drop_constraint("attempts_has_user_or_visitor", "attempts", type_="check")
    op.drop_constraint("activities_total_responses_nonnegative", "activities", type_="check")

    op.alter_column("questions", "type", existing_type=sa.String(length=32), type_=sa.String(), nullable=True)
    op.alter_column("activities", "total_responses", nullable=True)
    op.alter_column("activities", "is_shareable", nullable=True)
    op.alter_column("activities", "status", nullable=True)

    op.execute("UPDATE users SET role = 'professor' WHERE email = 'visitante@dicta.app'")
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = 'attemptstatus'
                  AND e.enumlabel = 'em progresso'
            ) THEN
                ALTER TYPE attemptstatus RENAME VALUE 'em progresso' TO 'em_progresso';
            END IF;
        END
        $$;
        """
    )


def _replace_fk(
    name: str,
    source_table: str,
    referent_table: str,
    local_cols: list[str],
    remote_cols: list[str],
    ondelete: str,
) -> None:
    op.drop_constraint(name, source_table, type_="foreignkey")
    op.create_foreign_key(
        name,
        source_table,
        referent_table,
        local_cols,
        remote_cols,
        ondelete=ondelete,
    )
