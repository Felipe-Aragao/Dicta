import os
import unittest
from datetime import datetime, timedelta, timezone
import uuid


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-with-at-least-32-bytes")

from pydantic import ValidationError

from app.schemas.activity import ActivityCreate, ActivityUpdate
from app.schemas.answer import AnswerCreate
from app.schemas.attempt import VisitorAttemptCreate
from app.schemas.question import QuestionCreate
from app.schemas.question_option import QuestionOptionCreate
from app.schemas.user import UserCreate


class SchemaValidationTests(unittest.TestCase):
    def test_activity_requires_non_empty_name(self):
        with self.assertRaises(ValidationError):
            ActivityCreate(name="")

    def test_activity_attempt_limit_allows_null_and_positive_values(self):
        self.assertIsNone(ActivityCreate(name="Prova").max_attempts_per_student)
        self.assertEqual(
            ActivityCreate(name="Prova", max_attempts_per_student=2).max_attempts_per_student,
            2,
        )
        self.assertIsNone(ActivityUpdate(max_attempts_per_student=None).max_attempts_per_student)

    def test_activity_attempt_limit_rejects_non_positive_values(self):
        with self.assertRaises(ValidationError):
            ActivityCreate(name="Prova", max_attempts_per_student=0)
        with self.assertRaises(ValidationError):
            ActivityUpdate(max_attempts_per_student=-1)

    def test_activity_end_date_must_be_future(self):
        future = datetime.now(timezone.utc) + timedelta(hours=1)
        past = datetime.now(timezone.utc) - timedelta(minutes=1)

        self.assertEqual(ActivityCreate(name="Prova", ends_at=future).ends_at, future)
        with self.assertRaises(ValidationError):
            ActivityCreate(name="Prova", ends_at=past)
        with self.assertRaises(ValidationError):
            ActivityUpdate(ends_at=past)

    def test_user_requires_valid_email(self):
        with self.assertRaises(ValidationError):
            UserCreate(name="Aluno", email="email-invalido")

    def test_question_requires_prompt(self):
        with self.assertRaises(ValidationError):
            QuestionCreate(activity_id=uuid.uuid4(), prompt="")

    def test_question_rejects_unknown_type(self):
        with self.assertRaises(ValidationError):
            QuestionCreate(activity_id=uuid.uuid4(), prompt="Enunciado", type="single")

    def test_question_option_restricts_letter_to_one_character(self):
        with self.assertRaises(ValidationError):
            QuestionOptionCreate(
                question_id=uuid.uuid4(),
                letter="AB",
                text="Alternativa",
            )

    def test_answer_restricts_chosen_letter_to_one_character(self):
        with self.assertRaises(ValidationError):
            AnswerCreate(
                attempt_id=uuid.uuid4(),
                question_id=uuid.uuid4(),
                chosen_letter="AA",
            )

    def test_visitor_attempt_requires_at_least_one_question(self):
        with self.assertRaises(ValidationError):
            VisitorAttemptCreate(visitor_name="Visitante", questions=[])


if __name__ == "__main__":
    unittest.main()
