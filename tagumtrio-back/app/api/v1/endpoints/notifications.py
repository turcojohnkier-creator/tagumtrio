from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.schemas.notification import NotificationPublic
from app.services.notification_service import get_unread_counts, list_notifications, mark_all_read, mark_read

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationPublic])
def get_notifications(
    unread: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return list_notifications(db, current_user.id, unread_only=unread)


@router.get("/unread-counts")
def get_unread_notification_counts(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return get_unread_counts(db, current_user.id)


@router.patch("/{notification_id}/read", status_code=http_status.HTTP_204_NO_CONTENT)
def patch_notification_read(notification_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    try:
        mark_read(db, notification_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/read-all", status_code=http_status.HTTP_204_NO_CONTENT)
def patch_notifications_read_all(
    type: str = Query(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    mark_all_read(db, current_user.id, type)
