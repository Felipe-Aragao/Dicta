import os
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch
import uuid


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-with-at-least-32-bytes")

from fastapi import HTTPException

from app.core.security import AuthContext
from app.models.activities import ActivityStatus
from app.models.users import RoleEnum
from app.routers.activities import create_activity
from app.routers.attempts import create_attempt
from app.schemas.activity import ActivityCreate
from app.schemas.attempt import AttemptCreate
from app.services.activity_service import ActivityService


class DummyDb:
    def __init__(self):
        self.added = []
        self.committed = False
        self.refreshed = None

    def add(self, item):
        self.added.append(item)

    def commit(self):
        self.committed = True

    def refresh(self, item):
        self.refreshed = item


class ActivityLimitTests(unittest.TestCase):
    def test_student_activity_creation_forces_infinite_limits(self):
        aluno = SimpleNamespace(id=uuid.uuid4(), role=RoleEnum.aluno)
        captured = {}

        class FakeActivityService:
            def __init__(self, db):
                pass

            def create(self, data):
                captured["data"] = data
                return SimpleNamespace(id=uuid.uuid4())

        with patch("app.routers.activities.ActivityService", FakeActivityService):
            create_activity(
                ActivityCreate(
                    name="Minha atividade",
                    is_shareable=True,
                    max_attempts_per_student=1,
                    ends_at=datetime.now(timezone.utc) + timedelta(days=1),
                ),
                db=object(),
                context=AuthContext(kind="user", user=aluno),
            )

        data = captured["data"]
        self.assertFalse(data.is_shareable)
        self.assertIsNone(data.max_attempts_per_student)
        self.assertIsNone(data.ends_at)

    def test_expired_activity_is_persisted_as_closed(self):
        db = DummyDb()
        activity = SimpleNamespace(
            status=ActivityStatus.ativo,
            ends_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )

        changed = ActivityService(db).close_if_expired(activity, commit=True)

        self.assertTrue(changed)
        self.assertEqual(activity.status, ActivityStatus.encerrado)
        self.assertTrue(db.committed)
        self.assertIs(db.refreshed, activity)

    def test_create_attempt_rejects_reached_attempt_limit(self):
        aluno = SimpleNamespace(id=uuid.uuid4(), role=RoleEnum.aluno)
        activity = SimpleNamespace(id=uuid.uuid4(), owner_id=uuid.uuid4(), is_shareable=True)

        fake_activity_service = Mock()
        fake_activity_service.get.return_value = activity
        fake_activity_service.is_closed.return_value = False
        fake_activity_service.has_reached_attempt_limit.return_value = True

        with patch("app.routers.attempts.ActivityService", return_value=fake_activity_service):
            with self.assertRaises(HTTPException) as raised:
                create_attempt(
                    AttemptCreate(activity_id=activity.id),
                    db=object(),
                    context=AuthContext(kind="user", user=aluno),
                )

        self.assertEqual(raised.exception.status_code, 409)
        self.assertEqual(raised.exception.detail, "Limite de tentativas atingido.")

    def test_create_attempt_allows_unlimited_activity(self):
        aluno = SimpleNamespace(id=uuid.uuid4(), role=RoleEnum.aluno)
        activity = SimpleNamespace(id=uuid.uuid4(), owner_id=uuid.uuid4(), is_shareable=True)
        created_attempt = SimpleNamespace(id=uuid.uuid4(), activity_id=activity.id, aluno_id=aluno.id)

        fake_activity_service = Mock()
        fake_activity_service.get.return_value = activity
        fake_activity_service.is_closed.return_value = False
        fake_activity_service.has_reached_attempt_limit.return_value = False

        fake_attempt_service = Mock()
        fake_attempt_service.create.return_value = created_attempt

        with patch("app.routers.attempts.ActivityService", return_value=fake_activity_service):
            with patch("app.routers.attempts.AttemptService", return_value=fake_attempt_service):
                result = create_attempt(
                    AttemptCreate(activity_id=activity.id),
                    db=object(),
                    context=AuthContext(kind="user", user=aluno),
                )

        self.assertIs(result, created_attempt)
        fake_attempt_service.create.assert_called_once()


if __name__ == "__main__":
    unittest.main()
