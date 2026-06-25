from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from app.models.announcement import Announcement
from app.schemas.announcement import AnnouncementCreate, AnnouncementPublic, AnnouncementUpdate


def _make_id(prefix: str = "ANN") -> str:
    token = uuid.uuid4().hex[:10].upper()
    return f"{prefix}-{token}"


def _roles_to_db(target_roles: list[str] | None) -> str | None:
    if not target_roles:
        return None
    return ",".join(sorted({role.strip() for role in target_roles if role and role.strip()})) or None


def _roles_from_db(stored: str | None) -> list[str] | None:
    if not stored:
        return None
    return [role for role in stored.split(",") if role]


def _to_public(record: Announcement) -> AnnouncementPublic:
    return AnnouncementPublic.model_validate({
        "id": record.id,
        "title": record.title,
        "body": record.body,
        "author": record.author,
        "pinned": record.pinned,
        "audience": record.audience,
        "visibility": record.visibility,
        "targetRoles": _roles_from_db(record.target_roles),
        "createdAt": record.created_at,
        "updatedAt": record.updated_at,
    })


def list_announcements(db: Session, viewer_role: str | None = None) -> list[AnnouncementPublic]:
    rows = db.query(Announcement).order_by(Announcement.pinned.desc(), Announcement.created_at.desc()).all()
    # GM manages announcements, so it always sees everything regardless of targeting.
    if viewer_role and viewer_role != "gm":
        rows = [row for row in rows if not row.target_roles or viewer_role in row.target_roles.split(",")]
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
        target_roles=_roles_to_db(payload.target_roles),
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
    if "target_roles" in payload.model_fields_set:
        record.target_roles = _roles_to_db(payload.target_roles)

    db.commit()
    db.refresh(record)
    return _to_public(record)


def delete_announcement(db: Session, announcement_id: str) -> None:
    record = db.get(Announcement, announcement_id)
    if record is None:
        raise ValueError("Announcement not found.")
    db.delete(record)
    db.commit()