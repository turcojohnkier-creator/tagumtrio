from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from app.models.announcement import Announcement
from app.schemas.announcement import AnnouncementCreate, AnnouncementPublic, AnnouncementUpdate


def _make_id(prefix: str = "ANN") -> str:
    token = uuid.uuid4().hex[:10].upper()
    return f"{prefix}-{token}"


def _to_public(record: Announcement) -> AnnouncementPublic:
    return AnnouncementPublic.model_validate({
        "id": record.id,
        "title": record.title,
        "body": record.body,
        "author": record.author,
        "pinned": record.pinned,
        "audience": record.audience,
        "visibility": record.visibility,
        "createdAt": record.created_at,
        "updatedAt": record.updated_at,
    })


def list_announcements(db: Session) -> list[AnnouncementPublic]:
    rows = db.query(Announcement).order_by(Announcement.pinned.desc(), Announcement.created_at.desc()).all()
    return [_to_public(row) for row in rows]


def create_announcement(db: Session, payload: AnnouncementCreate) -> AnnouncementPublic:
    record = Announcement(
        id=_make_id(),
        title=payload.title.strip(),
        body=payload.body.strip() if isinstance(payload.body, str) else payload.body,
        author=payload.author.strip() if isinstance(payload.author, str) else payload.author,
        pinned=bool(payload.pinned),
        audience=(payload.audience or "All employees").strip(),
        visibility=(payload.visibility or "all_employees").strip(),
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_public(record)


def update_announcement(db: Session, announcement_id: str, payload: AnnouncementUpdate) -> AnnouncementPublic:
    record = db.get(Announcement, announcement_id)
    if record is None:
        raise ValueError("Announcement not found.")

    if payload.title is not None:
        record.title = payload.title.strip()
    if payload.body is not None:
        record.body = payload.body.strip()
    if payload.author is not None:
        record.author = payload.author.strip()
    if payload.pinned is not None:
        record.pinned = bool(payload.pinned)
    if payload.audience is not None:
        record.audience = payload.audience.strip()
    if payload.visibility is not None:
        record.visibility = payload.visibility.strip()

    db.commit()
    db.refresh(record)
    return _to_public(record)


def delete_announcement(db: Session, announcement_id: str) -> None:
    record = db.get(Announcement, announcement_id)
    if record is None:
        raise ValueError("Announcement not found.")
    db.delete(record)
    db.commit()