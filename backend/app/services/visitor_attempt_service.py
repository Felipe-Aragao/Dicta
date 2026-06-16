from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.security import create_visitor_attempt_token
from app.models.activities import Activity, ActivityStatus
from app.models.answers import Answer
from app.models.attempts import Attempt, AttemptStatus
from app.models.question_options import QuestionOption
from app.models.questions import Question
from app.models.users import RoleEnum
from app.schemas.activity import ActivityCreate
from app.schemas.attempt import VisitorAttemptCreate, VisitorAttemptRead
from app.schemas.user import UserCreate
from app.services.activity_service import ActivityService
from app.services.question_service import QuestionService
from app.services.user_service import UserService

VISITOR_OWNER_EMAIL = "visitante@dicta.app"
VISITOR_OWNER_NAME = "Visitante"
VISITOR_ACTIVITY_PREFIX = "Atividade Visitante"
VISITOR_RETENTION_HOURS = 1


def ensure_aware(dt: datetime) -> datetime:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class VisitorAttemptService:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_owner(self):
        service = UserService(self.db)
        user = service.get_by_email(VISITOR_OWNER_EMAIL)
        if user:
            return user
        return service.create(
            UserCreate(
                role=RoleEnum.sistema,
                name=VISITOR_OWNER_NAME,
                email=VISITOR_OWNER_EMAIL,
                password_hash=None,
            )
        )

    def cleanup_expired_data(self) -> None:
        owner = self.get_or_create_owner()
        cutoff = datetime.now(timezone.utc) - timedelta(hours=VISITOR_RETENTION_HOURS)

        expired_activity_ids = [
            row[0]
            for row in (
                self.db.query(Activity.id)
                .filter(Activity.owner_id == owner.id)
                .filter(Activity.created_at < cutoff)
                .all()
            )
        ]
        if not expired_activity_ids:
            return

        attempt_ids = [
            row[0]
            for row in (
                self.db.query(Attempt.id)
                .filter(Attempt.activity_id.in_(expired_activity_ids))
                .all()
            )
        ]
        if attempt_ids:
            self.db.query(Answer).filter(Answer.attempt_id.in_(attempt_ids)).delete(
                synchronize_session=False
            )
            self.db.query(Attempt).filter(Attempt.id.in_(attempt_ids)).delete(
                synchronize_session=False
            )

        question_ids = [
            row[0]
            for row in (
                self.db.query(Question.id)
                .filter(Question.activity_id.in_(expired_activity_ids))
                .all()
            )
        ]
        if question_ids:
            self.db.query(QuestionOption).filter(
                QuestionOption.question_id.in_(question_ids)
            ).delete(synchronize_session=False)
            self.db.query(Question).filter(Question.id.in_(question_ids)).delete(
                synchronize_session=False
            )

        self.db.query(Activity).filter(Activity.id.in_(expired_activity_ids)).delete(
            synchronize_session=False
        )
        self.db.commit()

    def is_visitor_activity(self, activity: Activity) -> bool:
        owner = self.get_or_create_owner()
        return activity.owner_id == owner.id

    def is_activity_expired(self, activity: Activity) -> bool:
        created_at = ensure_aware(activity.created_at)
        if not created_at:
            return False
        return created_at < datetime.now(timezone.utc) - timedelta(hours=VISITOR_RETENTION_HOURS)

    def create_attempt(self, data: VisitorAttemptCreate) -> VisitorAttemptRead:
        self.cleanup_expired_data()

        owner = self.get_or_create_owner()
        visitor_name = data.visitor_name.strip()
        if not visitor_name:
            raise ValueError("Nome do visitante não pode ser vazio.")

        activity_name = (
            (data.activity_name or "").strip()
            or f"{VISITOR_ACTIVITY_PREFIX} - {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}"
        )

        activity = ActivityService(self.db).create(
            data=ActivityCreate(
                owner_id=owner.id,
                name=activity_name,
                discipline="visitante",
                status=ActivityStatus.rascunho,
                is_shareable=False,
            )
        )

        option_letters = ["A", "B", "C", "D", "E", "F"]
        for index, item in enumerate(data.questions or [], 1):
            prompt = (item.prompt or "").strip() or "Questao sem enunciado"

            question_type = item.type if item.type in {"multiple", "open"} else "open"
            if item.options:
                question_type = "multiple"

            question = Question(
                activity_id=activity.id,
                position=item.position or index,
                type=question_type,
                prompt=prompt,
            )
            self.db.add(question)
            self.db.flush()

            for opt_index, opt_text in enumerate(item.options or []):
                letter = option_letters[opt_index] if opt_index < len(option_letters) else None
                text = (opt_text or "").strip()
                if not letter or not text:
                    continue
                self.db.add(
                    QuestionOption(
                        question_id=question.id,
                        letter=letter,
                        text=text,
                    )
                )

        attempt = Attempt(
            activity_id=activity.id,
            visitor_name=visitor_name,
            status=AttemptStatus.em_progresso,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(attempt)
        activity.total_responses = 1
        self.db.add(activity)
        self.db.commit()
        self.db.refresh(attempt)

        questions = QuestionService(self.db).list(activity_id=activity.id, skip=0, limit=1000)
        created_at = ensure_aware(activity.created_at) or datetime.now(timezone.utc)
        expires_at = created_at + timedelta(hours=VISITOR_RETENTION_HOURS)

        access_token = create_visitor_attempt_token(
            attempt_id=attempt.id,
            activity_id=activity.id,
            expires_at=expires_at,
        )

        return VisitorAttemptRead(
            access_token=access_token,
            token_type="bearer",
            attempt=attempt,
            questions=questions,
            expires_at=expires_at,
        )
