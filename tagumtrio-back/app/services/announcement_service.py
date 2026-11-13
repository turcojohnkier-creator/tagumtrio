from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from app.models.announcement import Announcement
from app.models.user import User
from app.schemas.announcement import AnnouncementCreate, AnnouncementPublic, AnnouncementUpdate
from app.services.notification_service import notify_role


ANNOUNCEMENT_LINKS = {
    "employee": "/app/portal/announcements",
    "leadman": "/app/leadman/announcements",
    "production_incharge": "/app/announcements",
}


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


def _author_avatar_lookup(db: Session, records: list[Announcement]) -> dict[str, str | None]:
    """Map announcement id -> its author's avatar URL.

    Uses author_id when present. Older announcements only stored the author's
    name, so fall back to a name match when exactly one user has that name.
    """
    author_ids = {r.author_id for r in records if r.author_id}
    author_names = {r.author for r in records if not r.author_id and r.author}
    by_id: dict[int, User] = {}
    if author_ids:
        by_id = {u.id: u for u in db.query(User).filter(User.id.in_(author_ids)).all()}
    by_name: dict[str, User | None] = {}
    if author_names:
        for user in db.query(User).filter(User.name.in_(author_names)).all():
            # Ambiguous names (two users with the same name) get no picture.
            by_name[user.name] = None if user.name in by_name else user

    result: dict[str, str | None] = {}
    for record in records:
        user = by_id.get(record.author_id) if record.author_id else by_name.get(record.author or "")
        result[record.id] = user.avatar_url if user else None
    return result


def _to_public(record: Announcement, author_avatar_url: str | None = None) -> AnnouncementPublic:
    return AnnouncementPublic.model_validate({
        "id": record.id,
        "title": record.title,
        "body": record.body,
        "author": record.author,
        "authorAvatarUrl": author_avatar_url,
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
    avatars = _author_avatar_lookup(db, rows)
    return [_to_public(row, avatars.get(row.id)) for row in rows]


def create_announcement(db: Session, payload: AnnouncementCreate, author: User | None = None) -> AnnouncementPublic:
    record = Announcement(
        id=_make_id(),
        title=payload.title.strip(),
        body=payload.body.strip() if isinstance(payload.body, str) else payload.body,
        author=payload.author.strip() if isinstance(payload.author, str) else payload.author,
        author_id=author.id if author is not None else None,
        pinned=bool(payload.pinned),
        audience=(payload.audience or "All employees").strip(),
        visibility=(payload.visibility or "all_employees").strip(),
        target_roles=_roles_to_db(payload.target_roles),
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    target_roles = payload.target_roles or list(ANNOUNCEMENT_LINKS)
    for role in target_roles:
        notify_role(
            db,
            role,
            "announcement_new",
            "New announcement",
            record.title,
            ANNOUNCEMENT_LINKS.get(role),
        )

    return _to_public(record, _author_avatar_lookup(db, [record]).get(record.id))


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
    return _to_public(record, _author_avatar_lookup(db, [record]).get(record.id))


def delete_announcement(db: Session, announcement_id: str) -> None:
    record = db.get(Announcement, announcement_id)
    if record is None:
        raise ValueError("Announcement not found.")
    db.delete(record)
    db.commit()