from __future__ import annotations

from datetime import datetime, timezone
import uuid

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
) -> Notification | None:
    if recipient_user_id is None:
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


def notify_role(db: Session, role: str, type: str, title: str, message: str, link: str | None = None) -> None:
    recipients = db.query(User).filter(User.role == role, User.is_active.is_(True)).all()
    for recipient in recipients:
        create_notification(db, recipient.id, type, title, message, link)
    db.commit()


def notify_leadmen_for_department(
    db: Session,
    department: str,
    type: str,
    title: str,
    message: str,
    link: str | None = None,
) -> None:
    leadmen = db.query(User).filter(User.role == "leadman", User.is_active.is_(True)).all()
    for leadman in leadmen:
        assigned = leadman.departments or []
        if department in assigned:
            create_notification(db, leadman.id, type, title, message, link)
    db.commit()


def list_notifications(db: Session, user_id: int, unread_only: bool = False) -> list[NotificationPublic]:
    query = db.query(Notification).filter(Notification.recipient_user_id == user_id)
    if unread_only:
        query = query.filter(Notification.read_at.is_(None))
    rows = query.order_by(Notification.created_at.desc()).all()
    return [NotificationPublic.model_validate(row) for row in rows]


def get_unread_counts(db: Session, user_id: int) -> dict[str, int]:
    rows = (
        db.query(Notification)
        .filter(Notification.recipient_user_id == user_id, Notification.read_at.is_(None))
        .all()
    )
    counts: dict[str, int] = {}
    for row in rows:
        counts[row.type] = counts.get(row.type, 0) + 1
    return counts


def mark_read(db: Session, notification_id: str, user_id: int) -> None:
    record = db.get(Notification, notification_id)
    if record is None or record.recipient_user_id != user_id:
        raise ValueError("Notification not found.")
    record.read_at = datetime.now(timezone.utc)
    db.add(record)
    db.commit()


def mark_all_read(db: Session, user_id: int, type: str) -> None:
    rows = (
        db.query(Notification)
        .filter(Notification.recipient_user_id == user_id, Notification.type == type, Notification.read_at.is_(None))
        .all()
    )
    now = datetime.now(timezone.utc)
    for row in rows:
        row.read_at = now
    db.commit()
