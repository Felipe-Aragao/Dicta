import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.activity_state import is_activity_closed
from app.core.security import AuthContext
from app.models.activities import Activity
from app.models.answers import Answer
from app.models.attempts import Attempt, AttemptStatus
from app.models.question_options import QuestionOption
from app.models.questions import Question
from app.models.users import RoleEnum


def forbidden(detail: str = "Acesso não autorizado.") -> None:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def require_user(context: AuthContext):
    if context.kind != "user" or not context.user:
        forbidden("Acesso permitido apenas para usuários autenticados.")
    return context.user


def require_professor(context: AuthContext):
    user = require_user(context)
    if user.role != RoleEnum.professor:
        forbidden("Acesso permitido apenas para professores.")
    return user


def require_aluno(context: AuthContext):
    user = require_user(context)
    if user.role != RoleEnum.aluno:
        forbidden("Acesso permitido apenas para alunos.")
    return user


def is_activity_owner(context: AuthContext, activity: Activity) -> bool:
    return bool(context.kind == "user" and context.user and activity.owner_id == context.user.id)


def is_visitor_activity(context: AuthContext, activity_id: uuid.UUID) -> bool:
    return bool(context.kind == "visitor" and context.visitor_activity_id == activity_id)


def user_has_attempt_in_activity(db: Session, context: AuthContext, activity_id: uuid.UUID) -> bool:
    if context.kind != "user" or not context.user or context.user.role != RoleEnum.aluno:
        return False
    return (
        db.query(Attempt.id)
        .filter(Attempt.activity_id == activity_id)
        .filter(Attempt.aluno_id == context.user.id)
        .first()
        is not None
    )


def can_read_shared_activity(context: AuthContext, activity: Activity) -> bool:
    return bool(
        context.kind == "user"
        and context.user
        and context.user.role == RoleEnum.aluno
        and activity.is_shareable
        and not is_activity_closed(activity)
    )


def ensure_activity_read_access(db: Session, context: AuthContext, activity: Activity) -> None:
    if is_activity_owner(context, activity):
        return
    if is_visitor_activity(context, activity.id):
        return
    if user_has_attempt_in_activity(db, context, activity.id):
        return
    if can_read_shared_activity(context, activity):
        return
    forbidden()


def ensure_activity_owner(context: AuthContext, activity: Activity) -> None:
    if not is_activity_owner(context, activity):
        forbidden("Apenas o dono da atividade pode executar esta ação.")


def can_access_attempt(db: Session, context: AuthContext, attempt: Attempt) -> bool:
    if context.kind == "visitor":
        return context.visitor_attempt_id == attempt.id
    if context.kind != "user" or not context.user:
        return False
    if context.user.role == RoleEnum.aluno:
        return attempt.aluno_id == context.user.id
    if context.user.role == RoleEnum.professor:
        activity = db.query(Activity).filter(Activity.id == attempt.activity_id).first()
        return bool(activity and activity.owner_id == context.user.id)
    return False


def ensure_attempt_access(db: Session, context: AuthContext, attempt: Attempt) -> None:
    if not can_access_attempt(db, context, attempt):
        forbidden()


def can_write_attempt(context: AuthContext, attempt: Attempt) -> bool:
    if context.kind == "visitor":
        return context.visitor_attempt_id == attempt.id
    if context.kind != "user" or not context.user:
        return False
    return bool(context.user.role == RoleEnum.aluno and attempt.aluno_id == context.user.id)


def ensure_attempt_write_access(context: AuthContext, attempt: Attempt) -> None:
    if not can_write_attempt(context, attempt):
        forbidden()


def ensure_attempt_is_writable(db: Session, attempt: Attempt) -> None:
    if attempt.status == AttemptStatus.concluido:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tentativa já concluída.")

    activity = attempt.activity or db.query(Activity).filter(Activity.id == attempt.activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada.")
    if is_activity_closed(activity):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Atividade encerrada.")


def ensure_question_read_access(db: Session, context: AuthContext, question: Question) -> None:
    activity = db.query(Activity).filter(Activity.id == question.activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada.")
    ensure_activity_read_access(db, context, activity)


def ensure_question_owner_access(db: Session, context: AuthContext, question: Question) -> None:
    activity = db.query(Activity).filter(Activity.id == question.activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Atividade não encontrada.")
    ensure_activity_owner(context, activity)


def ensure_option_owner_access(db: Session, context: AuthContext, option: QuestionOption) -> None:
    question = db.query(Question).filter(Question.id == option.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Questão não encontrada.")
    ensure_question_owner_access(db, context, question)


def ensure_answer_access(db: Session, context: AuthContext, answer: Answer) -> None:
    attempt = db.query(Attempt).filter(Attempt.id == answer.attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa não encontrada.")
    ensure_attempt_access(db, context, attempt)


def ensure_answer_write_access(db: Session, context: AuthContext, answer: Answer) -> None:
    attempt = db.query(Attempt).filter(Attempt.id == answer.attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Tentativa não encontrada.")
    ensure_attempt_write_access(context, attempt)
