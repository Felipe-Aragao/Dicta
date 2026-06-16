import os
import unittest


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-with-at-least-32-bytes")

from fastapi import HTTPException

from app.routers.activities import _normalize_share_code


class ActivityShareCodeTests(unittest.TestCase):
    def test_accepts_plain_share_code(self):
        self.assertEqual(_normalize_share_code("abc123"), "ABC-123")

    def test_accepts_hyphenated_share_code(self):
        self.assertEqual(_normalize_share_code("abc-123"), "ABC-123")

    def test_accepts_percent_encoded_share_code(self):
        self.assertEqual(_normalize_share_code("ABC%2D123"), "ABC-123")

    def test_extracts_code_from_url_query(self):
        value = "https://dicta.local/atividades?code=qwe987"

        self.assertEqual(_normalize_share_code(value), "QWE-987")

    def test_extracts_code_from_url_path(self):
        value = "https://dicta.local/share/Z9Y8X7"

        self.assertEqual(_normalize_share_code(value), "Z9Y-8X7")

    def test_rejects_invalid_code(self):
        with self.assertRaises(HTTPException) as context:
            _normalize_share_code("codigo-invalido")

        self.assertEqual(context.exception.status_code, 400)

    def test_rejects_empty_code(self):
        with self.assertRaises(HTTPException) as context:
            _normalize_share_code("   ")

        self.assertEqual(context.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
