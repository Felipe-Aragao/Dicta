from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.activity import ActivityCreate, ActivityRead, ActivityUpdate
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/activities", tags=["activities"])


def _get_activity_or_404(service: ActivityService, activity_id: uuid.UUID):
    activity = service.get(activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")
    return activity


@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def create_activity(data: ActivityCreate, db: Session = Depends(get_db)):
    return ActivityService(db).create(data)


@router.get("", response_model=List[ActivityRead])
def list_activities(
    owner_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    return ActivityService(db).list(owner_id=owner_id, skip=skip, limit=limit)


@router.get("/{activity_id}", response_model=ActivityRead)
def get_activity(activity_id: uuid.UUID, db: Session = Depends(get_db)):
    service = ActivityService(db)
    return _get_activity_or_404(service, activity_id)


@router.put("/{activity_id}", response_model=ActivityRead)
def update_activity(
    activity_id: uuid.UUID,
    data: ActivityUpdate,
    db: Session = Depends(get_db),
):
    service = ActivityService(db)
    activity = _get_activity_or_404(service, activity_id)
    return service.update(activity, data)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(activity_id: uuid.UUID, db: Session = Depends(get_db)):
    service = ActivityService(db)
    activity = _get_activity_or_404(service, activity_id)
    service.delete(activity)
    return None
