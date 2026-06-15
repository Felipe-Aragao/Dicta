import os
import unittest


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-with-at-least-32-bytes")

from app.services.pdf_llm_service import (
    LlmExtractionError,
    NotAnExamError,
    build_question_extraction_prompt,
    parse_llm_questions_response,
)


class PdfLlmServiceTests(unittest.TestCase):
    def test_prompt_includes_question_limit(self):
        prompt = build_question_extraction_prompt("Questão 1. Exemplo?", num_questions=3)

        self.assertIn("Limite estritamente a 3 questões.", prompt)
        self.assertIn("TEXTO DA PROVA:", prompt)

    def test_parse_valid_llm_response(self):
        questions = parse_llm_questions_response(
            """
            [
              {"type": "multiple", "text": "Qual estrutura segue LIFO?", "options": ["A) Fila", "B) Pilha"]},
              {"type": "open", "text": "Explique herança em POO."}
            ]
            """
        )

        self.assertEqual(len(questions), 2)
        self.assertEqual(questions[0]["type"], "multiple")
        self.assertEqual(questions[0]["options"], ["A) Fila", "B) Pilha"])
        self.assertEqual(questions[1]["type"], "open")
        self.assertNotIn("options", questions[1])

    def test_parse_rejects_not_an_exam_response(self):
        with self.assertRaises(NotAnExamError):
            parse_llm_questions_response('[{"type": "error", "text": "not_an_exam"}]')

    def test_parse_rejects_invalid_json(self):
        with self.assertRaises(LlmExtractionError):
            parse_llm_questions_response("nao e json")

    def test_parse_rejects_empty_question_list(self):
        with self.assertRaises(LlmExtractionError):
            parse_llm_questions_response("[]")


if __name__ == "__main__":
    unittest.main()
