from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.schemas.notification import NotificationPublic
from app.services.notification_service import (
    get_notification_summary,
    get_unread_counts,
    list_notifications,
    mark_all_read,
    mark_read,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationPublic])
def get_notifications(
    unread: bool = Query(default=False),
    limit: int | None = Query(default=None, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    return list_notifications(db, current_user.id, unread_only=unread, limit=limit)


# Static paths are registered before "/{notification_id}/read".
@router.get("/summary")
def get_summary(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Unread counts per type (nav red dots) + the most recent notifications (bell, toasts)."""
    return get_notification_summary(db, current_user.id, limit=limit)


@router.get("/unread-counts")
def get_unread_notification_counts(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return get_unread_counts(db, current_user.id)


@router.patch("/read-all", status_code=http_status.HTTP_204_NO_CONTENT)
def patch_notifications_read_all(
    type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    # No type = mark every unread notification read ("Mark all as read").
    mark_all_read(db, current_user.id, type)


@router.patch("/{notification_id}/read", status_code=http_status.HTTP_204_NO_CONTENT)
def patch_notification_read(notification_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    try:
        mark_read(db, notification_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
