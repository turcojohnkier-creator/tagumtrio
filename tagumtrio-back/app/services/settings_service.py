from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.app_setting import AppSetting

# GM switch: when False, attendance ignores the time in / time out windows
# (demo mode) and stays open all day.
ATTENDANCE_SCHEDULE_ENABLED = "attendance_schedule_enabled"


def get_setting(db: Session, key: str, default: Any = None) -> Any:
    row = db.get(AppSetting, key)
    return default if row is None or row.value is None else row.value


def set_setting(db: Session, key: str, value: Any, updated_by: int | None = None) -> Any:
    row = db.get(AppSetting, key)
    if row is None:
        row = AppSetting(key=key)
    row.value = value
    row.updated_by = updated_by
    db.add(row)
    db.commit()
    return value


def is_attendance_schedule_enabled(db: Session) -> bool:
    return bool(get_setting(db, ATTENDANCE_SCHEDULE_ENABLED, True))
