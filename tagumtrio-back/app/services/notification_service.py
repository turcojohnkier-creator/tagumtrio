from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationPublic


def _make_id() -> str:
    return f"NOTIF-{uuid.uuid4().hex[:10].upper()}"


def create_notification(
    db: Session,
    recipient_user_id: int | None,
    type: str,
    title: str,
    message: str,
    link: str | None = None,
    dedupe: bool = False,
) -> Notification | None:
    """Store one notification.

    dedupe=True skips the insert when the recipient already has an *unread*
    notification with the same type and message. Bundle actions (e.g. the GM
    approving every report of one department/day) call this once per report,
    which would otherwise stack identical notifications.
    """
    if recipient_user_id is None:
        return None
    if dedupe:
        existing = (
            db.query(Notification.id)
            .filter(
                Notification.recipient_user_id == recipient_user_id,
                Notification.type == type,
                Notification.message == message,
                Notification.read_at.is_(None),
            )
            .first()
        )
        if existing is not None:
            return None
    record = Notification(
        id=_make_id(),
        recipient_user_id=recipient_user_id,
        type=type,
        title=title,
        message=message,
        link=link,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def notify_role(db: Session, role: str, type: str, title: str, message: str, link: str | None = None, dedupe: bool = False) -> None:
    recipients = db.query(User).filter(User.role == role, User.is_active.is_(True)).all()
    for recipient in recipients:
        create_notification(db, recipient.id, type, title, message, link, dedupe=dedupe)
    db.commit()


def notify_leadmen_for_department(
    db: Session,
    department: str,
    type: str,
    title: str,
    message: str,
    link: str | None = None,
    dedupe: bool = False,
) -> None:
    # A leadman can handle several departments (`departments`); older accounts
    # only have the single `department` field. Match either, ignoring case.
    wanted = str(department or "").strip().lower()
    leadmen = db.query(User).filter(User.role == "leadman", User.is_active.is_(True)).all()
    for leadman in leadmen:
        assigned = list(leadman.departments or [])
        if leadman.department:
            assigned.append(leadman.department)
        if wanted and wanted in {str(name).strip().lower() for name in assigned if name}:
            create_notification(db, leadman.id, type, title, message, link, dedupe=dedupe)
    db.commit()


def list_notifications(db: Session, user_id: int, unread_only: bool = False, limit: int | None = None) -> list[NotificationPublic]:
    query = db.query(Notification).filter(Notification.recipient_user_id == user_id)
    if unread_only:
        query = query.filter(Notification.read_at.is_(None))
    query = query.order_by(Notification.created_at.desc())
    if limit:
        query = query.limit(limit)
    return [NotificationPublic.model_validate(row) for row in query.all()]


def get_unread_counts(db: Session, user_id: int) -> dict[str, int]:
    rows = (
        db.query(Notification.type, func.count(Notification.id))
        .filter(Notification.recipient_user_id == user_id, Notification.read_at.is_(None))
        .group_by(Notification.type)
        .all()
    )
    return {type_: int(count) for type_, count in rows}


def get_notification_summary(db: Session, user_id: int, limit: int = 20) -> dict:
    """Everything the bell, toasts and red dots need, in one poll."""
    return {
        "unreadCounts": get_unread_counts(db, user_id),
        "recent": [item.model_dump(by_alias=True, mode="json") for item in list_notifications(db, user_id, limit=limit)],
    }


def mark_read(db: Session, notification_id: str, user_id: int) -> None:
    record = db.get(Notification, notification_id)
    if record is None or record.recipient_user_id != user_id:
        raise ValueError("Notification not found.")
    if record.read_at is None:
        record.read_at = datetime.now(timezone.utc)
        db.add(record)
        db.commit()


def mark_all_read(db: Session, user_id: int, type: str | None = None) -> None:
    """Mark unread notifications read — one type, or all of them when type is None."""
    query = db.query(Notification).filter(Notification.recipient_user_id == user_id, Notification.read_at.is_(None))
    if type:
        query = query.filter(Notification.type == type)
    now = datetime.now(timezone.utc)
    for row in query.all():
        row.read_at = now
    db.commit()
