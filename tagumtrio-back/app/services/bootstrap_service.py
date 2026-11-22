"""Make sure the system can always be logged into, without touching the database.

At startup, for each of GM and HR: if no active account with that role exists,
the default account (DEFAULT_GM_* / DEFAULT_HR_* settings) is created, or
re-enabled with the configured password if that username already exists.
Existing accounts are otherwise never changed.

RESET_ADMIN_PASSWORDS=true additionally resets the two default accounts to
their configured passwords on every start; meant to be set once, then removed.
"""
from __future__ import annotations

import logging

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.security import get_password_hash

logger = logging.getLogger("uvicorn.error")

DEFAULT_PASSWORD_FALLBACK = "123456"


def _default_accounts() -> list[dict]:
    return [
        {
            "role": "gm",
            "identifier": settings.DEFAULT_GM_IDENTIFIER,
            "password": settings.DEFAULT_GM_PASSWORD,
            "name": settings.DEFAULT_GM_NAME,
            "password_setting": "DEFAULT_GM_PASSWORD",
        },
        {
            "role": "hr",
            "identifier": settings.DEFAULT_HR_IDENTIFIER,
            "password": settings.DEFAULT_HR_PASSWORD,
            "name": settings.DEFAULT_HR_NAME,
            "password_setting": "DEFAULT_HR_PASSWORD",
        },
    ]


def _has_active(db: Session, role: str) -> bool:
    return db.query(User.id).filter(
        User.role == role,
        User.archived_at.is_(None),
        User.is_active.isnot(False),
    ).first() is not None


def _ensure_account(db: Session, account: dict, reset: bool) -> None:
    role = account["role"]
    # The login form lowercases what is typed, so stored usernames must be lowercase.
    identifier = (account["identifier"] or "").strip().lower()
    password = account["password"] or ""
    if not identifier or not password:
        logger.warning("Default %s account skipped: username or password setting is empty.", role.upper())
        return
    if not reset and _has_active(db, role):
        return

    user = db.query(User).filter(User.identifier == identifier).first()
    if user is None:
        user = User(
            name=account["name"] or role.upper(),
            identifier=identifier,
            role=role,
            hashed_password=get_password_hash(password),
            is_active=True,
        )
        db.add(user)
        action = "created"
    else:
        user.role = role
        user.is_active = True
        user.archived_at = None
        user.hashed_password = get_password_hash(password)
        action = "password reset" if reset else "re-enabled"
    db.commit()
    logger.info("Default %s account '%s' %s.", role.upper(), identifier, action)
    if password == DEFAULT_PASSWORD_FALLBACK:
        logger.warning(
            "Default %s account '%s' uses the public fallback password. Set %s in the environment.",
            role.upper(), identifier, account["password_setting"],
        )


def ensure_default_accounts(session_factory) -> None:
    reset = bool(settings.RESET_ADMIN_PASSWORDS)
    if reset:
        logger.warning("RESET_ADMIN_PASSWORDS is on: resetting the default GM/HR passwords. Remove it after this start.")
    for account in _default_accounts():
        with session_factory() as db:
            try:
                _ensure_account(db, account, reset)
            except IntegrityError:
                # Another worker created it at the same moment.
                db.rollback()
            except Exception:
                db.rollback()
                logger.exception("Could not ensure the default %s account.", account["role"].upper())
