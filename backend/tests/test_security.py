import os
import unittest


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-with-at-least-32-bytes")

from app.core.security import create_access_token, decode_access_token
from app.services.auth_service import hash_password, verify_password


class SecurityTests(unittest.TestCase):
    def test_password_hash_roundtrip(self):
        stored = hash_password("senha-forte")

        self.assertTrue(verify_password(stored, "senha-forte"))
        self.assertFalse(verify_password(stored, "senha-errada"))

    def test_legacy_plain_password_comparison_still_works(self):
        self.assertTrue(verify_password("abc123", "abc123"))
        self.assertFalse(verify_password("abc123", "outra"))

    def test_access_token_contains_subject_and_role(self):
        token = create_access_token(subject="00000000-0000-0000-0000-000000000001", role="aluno")

        payload = decode_access_token(token)

        self.assertEqual(payload["sub"], "00000000-0000-0000-0000-000000000001")
        self.assertEqual(payload["role"], "aluno")

    def test_decode_access_token_rejects_malformed_token(self):
        with self.assertRaises(Exception) as raised:
            decode_access_token("token-invalido")

        self.assertEqual(getattr(raised.exception, "status_code", None), 401)


if __name__ == "__main__":
    unittest.main()
