import os
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-with-at-least-32-bytes")

from app.services.attempt_pdf_service import (
    answer_text,
    sanitize_filename,
)
from app.services.visitor_attempt_service import (
    VISITOR_RETENTION_HOURS,
    VisitorAttemptService,
    ensure_aware,
)


class RouterHelperTests(unittest.TestCase):
    def test_sanitize_filename_removes_invalid_characters(self):
        value = 'Prova: "Final" / Turma A?'

        self.assertEqual(sanitize_filename(value), "Prova Final Turma A")

    def test_sanitize_filename_uses_default_when_empty(self):
        self.assertEqual(sanitize_filename('"/\\'), "respostas")

    def test_answer_text_prefers_response_text(self):
        answer = SimpleNamespace(response_text="  Resposta escrita  ", chosen_letter="A")

        self.assertEqual(answer_text(answer, None), "Resposta escrita")

    def test_answer_text_resolves_chosen_letter_to_option_text(self):
        answer = SimpleNamespace(response_text=None, chosen_letter="B")
        question = SimpleNamespace(
            options=[
                SimpleNamespace(letter="A", text="Primeira"),
                SimpleNamespace(letter="B", text="Segunda"),
            ]
        )

        self.assertEqual(answer_text(answer, question), "B) Segunda")

    def test_ensure_aware_adds_utc_to_naive_datetime(self):
        value = datetime(2026, 1, 1, 12, 0, 0)

        self.assertEqual(ensure_aware(value).tzinfo, timezone.utc)

    def test_is_activity_expired_uses_visitor_retention_window(self):
        expired = SimpleNamespace(
            created_at=datetime.now(timezone.utc) - timedelta(hours=VISITOR_RETENTION_HOURS + 1)
        )
        fresh = SimpleNamespace(created_at=datetime.now(timezone.utc))

        service = VisitorAttemptService(db=None)

        self.assertTrue(service.is_activity_expired(expired))
        self.assertFalse(service.is_activity_expired(fresh))


if __name__ == "__main__":
    unittest.main()
