import os
import unittest


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-with-at-least-32-bytes")

from app.models.activities import Activity
from app.models.answers import Answer
from app.models.attempts import AttemptStatus
from app.models.question_options import QuestionOption
from app.models.questions import QuestionType
from app.models.users import RoleEnum


class DatabaseContractTests(unittest.TestCase):
    def test_visitor_owner_uses_system_role(self):
        self.assertEqual(RoleEnum.sistema.value, "sistema")

    def test_attempt_status_value_matches_api_payload(self):
        self.assertEqual(AttemptStatus.em_progresso.value, "em progresso")
        self.assertEqual(AttemptStatus.concluido.value, "concluido")

    def test_question_type_values_match_frontend_payloads(self):
        self.assertEqual(QuestionType.open.value, "open")
        self.assertEqual(QuestionType.multiple.value, "multiple")

    def test_answer_has_unique_attempt_question_contract(self):
        constraints = {constraint.name for constraint in Answer.__table__.constraints}

        self.assertIn("uq_answers_attempt_question", constraints)
        self.assertIn("answers_has_response", constraints)

    def test_activity_attempt_limit_has_positive_contract(self):
        constraints = {constraint.name for constraint in Activity.__table__.constraints}

        self.assertIn("activities_max_attempts_positive", constraints)

    def test_question_options_are_unique_by_question_and_letter(self):
        constraints = {constraint.name for constraint in QuestionOption.__table__.constraints}

        self.assertIn("uq_question_options_question_letter", constraints)


if __name__ == "__main__":
    unittest.main()
