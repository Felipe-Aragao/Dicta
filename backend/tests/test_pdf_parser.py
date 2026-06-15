import os
import unittest


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-with-at-least-32-bytes")

from app.routers.pdf import extract_questions_from_text


class PdfParserTests(unittest.TestCase):
    def test_extracts_multiple_choice_and_open_questions(self):
        text = """
        Instruções gerais:
        Responda as questões abaixo.

        Questão 1. Qual estrutura segue o princípio LIFO?
        A) Fila
        B) Pilha
        C) Grafo
        D) Árvore

        Questão 2. Explique o conceito de herança em programação orientada a objetos.
        """

        questions = extract_questions_from_text(text)

        self.assertEqual(len(questions), 2)
        self.assertEqual(questions[0].type, "multiple")
        self.assertIn("LIFO", questions[0].text)
        self.assertEqual(questions[0].options, ["Fila", "Pilha", "Grafo", "Árvore"])
        self.assertEqual(questions[1].type, "open")
        self.assertIn("herança", questions[1].text)

    def test_respects_question_limit(self):
        text = """
        1. Primeira pergunta com texto suficiente?
        A) Sim
        B) Não

        2. Segunda pergunta com texto suficiente?
        A) Sim
        B) Não
        """

        questions = extract_questions_from_text(text, limit=1)

        self.assertEqual(len(questions), 1)
        self.assertIn("Primeira", questions[0].text)

    def test_splits_inline_options(self):
        text = """
        1. Qual alternativa está correta? A) Primeira opção B) Segunda opção C) Terceira opção
        """

        questions = extract_questions_from_text(text)

        self.assertEqual(len(questions), 1)
        self.assertEqual(questions[0].type, "multiple")
        self.assertEqual(
            questions[0].options,
            ["Primeira opção", "Segunda opção", "Terceira opção"],
        )

    def test_ignores_metadata_before_first_numbered_question(self):
        text = """
        Nome: Aluno Exemplo
        Data: 01/01/2026
        2026. Este número no cabeçalho não é questão.

        1. Primeira pergunta válida com texto suficiente?
        A) Sim
        B) Não
        """

        questions = extract_questions_from_text(text)

        self.assertEqual(len(questions), 1)
        self.assertIn("Primeira pergunta", questions[0].text)


if __name__ == "__main__":
    unittest.main()
