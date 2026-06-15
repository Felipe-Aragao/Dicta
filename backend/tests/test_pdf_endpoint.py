import os
import unittest


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-with-at-least-32-bytes")

from fastapi.testclient import TestClient

from app.main import app


class PdfEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_receive_pdf_requires_file(self):
        response = self.client.post("/pdf/receive")

        self.assertEqual(response.status_code, 422)

    def test_receive_pdf_rejects_non_pdf_content_type(self):
        response = self.client.post(
            "/pdf/receive",
            files={"pdf": ("prova.txt", b"texto", "text/plain")},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Arquivo deve ser PDF.")

    def test_receive_pdf_rejects_invalid_question_amount_before_processing_file(self):
        response = self.client.post(
            "/pdf/receive",
            data={"num_questions": "0"},
            files={"pdf": ("prova.pdf", b"%PDF-1.4\n", "application/pdf")},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Quantidade de questões inválida.")

    def test_receive_pdf_rejects_file_without_pdf_header(self):
        response = self.client.post(
            "/pdf/receive",
            files={"pdf": ("prova.pdf", b"not a pdf", "application/pdf")},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Arquivo não parece um PDF válido.")


if __name__ == "__main__":
    unittest.main()
