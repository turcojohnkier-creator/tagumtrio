from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceMark

# The Philippines has no DST, so a fixed offset is exact and avoids needing
# the tzdata package on Windows dev machines.
MANILA = timezone(timedelta(hours=8))

# Work sessions in Manila time. Every end is a time-out: once it passes, the
# current session changes and everyone reads as inactive again.
SESSIONS = [
    {"key": "morning", "label": "Morning", "start": time(7, 0), "end": time(11, 30)},
    {"key": "afternoon", "label": "Afternoon", "start": time(13, 0), "end": time(16, 0)},
    {"key": "overtime", "label": "Overtime", "start": time(16, 0), "end": time(18, 0)},
]


def _session_public(session: dict) -> dict:
    return {
        "key": session["key"],
        "label": session["label"],
        "start": session["start"].strftime("%H:%M"),
        "end": session["end"].strftime("%H:%M"),
    }


# Used while the GM has switched the time in / time out schedule off (demo
# mode): one session spanning the whole day, so attendance can be marked at
# any hour. Marks then reset at midnight instead of at each time-out.
DEMO_SESSION = {"key": "demo", "label": "Demo", "start": time(0, 0), "end": time(23, 59)}


def get_session_state(now: datetime | None = None, schedule_enabled: bool = True) -> dict:
    """Which session (if any) is running at `now`, in Manila time."""
    now = (now or datetime.now(timezone.utc)).astimezone(MANILA)
    today = now.date()
    clock = now.time()

    def at(t: time) -> datetime:
        return datetime.combine(today, t, tzinfo=MANILA)

    base = {"workDate": today.isoformat(), "serverTime": now, "scheduleEnabled": schedule_enabled}

    if not schedule_enabled:
        next_midnight = datetime.combine(today + timedelta(days=1), time(0, 0), tzinfo=MANILA)
        return {**base, "state": "open", "session": _session_public(DEMO_SESSION), "nextSession": None, "nextChangeAt": next_midnight}

    for session in SESSIONS:
        if session["start"] <= clock < session["end"]:
            return {**base, "state": "open", "session": _session_public(session), "nextSession": None, "nextChangeAt": at(session["end"])}

    upcoming = next((s for s in SESSIONS if clock < s["start"]), None)
    if upcoming is None:
        tomorrow_first = datetime.combine(today + timedelta(days=1), SESSIONS[0]["start"], tzinfo=MANILA)
        return {**base, "state": "ended", "session": None, "nextSession": _session_public(SESSIONS[0]), "nextChangeAt": tomorrow_first}

    state = "before" if upcoming is SESSIONS[0] else "lunch"
    return {**base, "state": state, "session": None, "nextSession": _session_public(upcoming), "nextChangeAt": at(upcoming["start"])}


def list_present_ids(db: Session, work_date: str, session_key: str, employee_ids: list[int] | None = None) -> list[int]:
    query = db.query(AttendanceMark.employee_id).filter(
        AttendanceMark.work_date == work_date,
        AttendanceMark.session == session_key,
    )
    if employee_ids is not None:
        if not employee_ids:
            return []
        query = query.filter(AttendanceMark.employee_id.in_(employee_ids))
    return sorted({row[0] for row in query.all()})


def set_present(db: Session, employee_id: int, work_date: str, session_key: str, present: bool, marked_by: int | None) -> None:
    existing = (
        db.query(AttendanceMark)
        .filter(
            AttendanceMark.employee_id == employee_id,
            AttendanceMark.work_date == work_date,
            AttendanceMark.session == session_key,
        )
        .first()
    )
    if present:
        if existing is not None:
            return
        db.add(AttendanceMark(employee_id=employee_id, work_date=work_date, session=session_key, marked_by=marked_by))
        try:
            db.commit()
        except IntegrityError:
            # Another request marked the same employee first — same outcome.
            db.rollback()
        return

    if existing is not None:
        db.delete(existing)
        db.commit()
