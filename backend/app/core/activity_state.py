from datetime import datetime, timezone
from typing import Optional

from app.models.activities import Activity, ActivityStatus


def ensure_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def is_activity_expired(activity: Activity, now: Optional[datetime] = None) -> bool:
    ends_at = ensure_aware(getattr(activity, "ends_at", None))
    if not ends_at:
        return False
    current_time = ensure_aware(now) or datetime.now(timezone.utc)
    return ends_at <= current_time


def is_activity_closed(activity: Activity, now: Optional[datetime] = None) -> bool:
    return (
        getattr(activity, "status", None) == ActivityStatus.encerrado
        or is_activity_expired(activity, now=now)
    )
