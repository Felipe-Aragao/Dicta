import os
import unittest


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-with-at-least-32-bytes")

from app.main import app


class OpenApiTests(unittest.TestCase):
    def test_openapi_schema_is_generated_with_core_paths(self):
        schema = app.openapi()
        paths = schema.get("paths", {})

        self.assertIn("/auth/login", paths)
        self.assertIn("/activities", paths)
        self.assertIn("/attempts", paths)
        self.assertIn("/answers", paths)
        self.assertIn("/pdf/receive", paths)


if __name__ == "__main__":
    unittest.main()
