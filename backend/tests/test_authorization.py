import os
import unittest
import uuid
from types import SimpleNamespace


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-with-at-least-32-bytes")

from fastapi import HTTPException

from app.core.authorization import (
    can_read_shared_activity,
    ensure_activity_owner,
    ensure_activity_read_access,
    ensure_attempt_write_access,
    require_aluno,
    require_professor,
    require_user,
)
from app.core.security import AuthContext
from app.models.activities import ActivityStatus
from app.models.users import RoleEnum


class EmptyQuery:
    def filter(self, *args):
        return self

    def first(self):
        return None


class EmptyDb:
    def query(self, *args):
        return EmptyQuery()


def user(role, user_id=None):
    return SimpleNamespace(id=user_id or uuid.uuid4(), role=role)


def activity(owner_id=None, status=ActivityStatus.ativo, is_shareable=False):
    return SimpleNamespace(
        id=uuid.uuid4(),
        owner_id=owner_id or uuid.uuid4(),
        status=status,
        is_shareable=is_shareable,
    )


class AuthorizationTests(unittest.TestCase):
    def test_require_user_rejects_visitor_context(self):
        context = AuthContext(kind="visitor", visitor_attempt_id=uuid.uuid4())

        with self.assertRaises(HTTPException) as raised:
            require_user(context)

        self.assertEqual(raised.exception.status_code, 403)

    def test_require_professor_and_aluno_enforce_roles(self):
        professor = user(RoleEnum.professor)
        aluno = user(RoleEnum.aluno)

        self.assertIs(require_professor(AuthContext(kind="user", user=professor)), professor)
        self.assertIs(require_aluno(AuthContext(kind="user", user=aluno)), aluno)

        with self.assertRaises(HTTPException):
            require_professor(AuthContext(kind="user", user=aluno))
        with self.assertRaises(HTTPException):
            require_aluno(AuthContext(kind="user", user=professor))

    def test_owner_can_read_and_manage_activity(self):
        owner = user(RoleEnum.professor)
        owned_activity = activity(owner_id=owner.id)
        context = AuthContext(kind="user", user=owner)

        ensure_activity_owner(context, owned_activity)
        ensure_activity_read_access(EmptyDb(), context, owned_activity)

    def test_shared_active_activity_is_readable_by_aluno(self):
        aluno = user(RoleEnum.aluno)
        shared_activity = activity(is_shareable=True, status=ActivityStatus.ativo)
        context = AuthContext(kind="user", user=aluno)

        self.assertTrue(can_read_shared_activity(context, shared_activity))
        ensure_activity_read_access(EmptyDb(), context, shared_activity)

    def test_closed_shared_activity_is_not_readable_by_aluno(self):
        aluno = user(RoleEnum.aluno)
        shared_activity = activity(is_shareable=True, status=ActivityStatus.encerrado)
        context = AuthContext(kind="user", user=aluno)

        self.assertFalse(can_read_shared_activity(context, shared_activity))
        with self.assertRaises(HTTPException) as raised:
            ensure_activity_read_access(EmptyDb(), context, shared_activity)

        self.assertEqual(raised.exception.status_code, 403)

    def test_visitor_can_write_only_matching_attempt(self):
        attempt_id = uuid.uuid4()
        context = AuthContext(kind="visitor", visitor_attempt_id=attempt_id)
        attempt = SimpleNamespace(id=attempt_id)

        ensure_attempt_write_access(context, attempt)

        with self.assertRaises(HTTPException):
            ensure_attempt_write_access(context, SimpleNamespace(id=uuid.uuid4()))


if __name__ == "__main__":
    unittest.main()
