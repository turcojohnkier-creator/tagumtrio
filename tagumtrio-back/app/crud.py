from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app import models, schemas
from app.security import get_password_hash


def normalize_role(role: str) -> str:
    if not role:
        return "employee"
    role = role.strip().lower()
    # Normalize production role to `production_incharge`
    if role in {"production_head", "production_incharged", "production incharge", "production in-charged", "production incharged"}:
        return "production_incharge"
    # Normalize admin/hr to single `hr` role
    if role in {"admin", "hr", "human_resources", "human-resource", "human resources"}:
        return "hr"
    return role


def get_user_by_identifier(db: Session, identifier: str):
    return db.query(models.User).filter(models.User.identifier == identifier).first()


def create_user(db: Session, user_create: schemas.UserCreate):
    user = models.User(
        name=user_create.name,
        identifier=user_create.identifier,
        role=normalize_role(user_create.role),
        department=user_create.department,
        departments=user_create.departments,
        hashed_password=get_password_hash(user_create.password),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: int, data: dict):
    user = db.get(models.User, user_id)
    if user is None:
        raise ValueError("User not found.")
    for key, value in data.items():
        if hasattr(user, key) and value is not None:
            setattr(user, key, value)
    # Track when an account was archived so it can be permanently purged after
    # the retention window — stamp on archive, clear on reactivate.
    if "is_active" in data:
        user.archived_at = None if data["is_active"] else datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
