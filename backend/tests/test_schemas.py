import os
import unittest
import uuid


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-with-at-least-32-bytes")

from pydantic import ValidationError

from app.schemas.activity import ActivityCreate
from app.schemas.answer import AnswerCreate
from app.schemas.attempt import VisitorAttemptCreate
from app.schemas.question import QuestionCreate
from app.schemas.question_option import QuestionOptionCreate
from app.schemas.user import UserCreate


class SchemaValidationTests(unittest.TestCase):
    def test_activity_requires_non_empty_name(self):
        with self.assertRaises(ValidationError):
            ActivityCreate(name="")

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
