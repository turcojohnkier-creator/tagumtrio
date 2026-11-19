from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.attendance import AttendanceScheduleUpdate, AttendanceStatus, AttendanceToggle
from app.services.attendance_service import get_session_state, list_present_ids, set_present
from app.services.settings_service import ATTENDANCE_SCHEDULE_ENABLED, is_attendance_schedule_enabled, set_setting

router = APIRouter(prefix="/attendance", tags=["attendance"])

VIEWER_ROLES = {"leadman", "production_incharge", "hr", "gm", "admin"}
LOCKED_MESSAGES = {
    "before": "Attendance opens at 7:00 AM.",
    "lunch": "Attendance is locked during lunch break. It opens again at 1:00 PM.",
    "ended": "The work day has ended. Attendance opens again tomorrow at 7:00 AM.",
}


def _leadman_departments(user: User) -> set[str]:
    assigned = list(user.departments or [])
    if user.department:
        assigned.append(user.department)
    return {str(name).strip().lower() for name in assigned if name}


def _deployed_employee_ids(db: Session, department: str | None) -> list[int]:
    query = db.query(User.id).filter(User.role == "employee", User.is_active.is_(True))
    if department:
        query = query.filter(func.lower(User.department) == department.strip().lower())
    return [row[0] for row in query.all()]


def _current_state(db: Session) -> dict:
    # The GM can switch the time in / time out schedule off for demos.
    return get_session_state(schedule_enabled=is_attendance_schedule_enabled(db))


def _build_status(db: Session, department: str | None) -> AttendanceStatus:
    state = _current_state(db)
    present: list[int] = []
    if state["state"] == "open":
        present = list_present_ids(
            db,
            state["workDate"],
            state["session"]["key"],
            _deployed_employee_ids(db, department),
        )
    return AttendanceStatus.model_validate({**state, "presentEmployeeIds": present})


@router.get("/current", response_model=AttendanceStatus)
def get_current_attendance(
    department: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> AttendanceStatus:
    if current_user.role not in VIEWER_ROLES:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return _build_status(db, department)


@router.put("/current/{employee_id}", response_model=AttendanceStatus)
def set_current_attendance(
    employee_id: int,
    payload: AttendanceToggle,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> AttendanceStatus:
    if current_user.role != "leadman":
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Only a leadman can update attendance")

    # The server's clock decides whether a session is open, never the client's.
    state = _current_state(db)
    if state["state"] != "open":
        raise HTTPException(status_code=http_status.HTTP_409_CONFLICT, detail=LOCKED_MESSAGES[state["state"]])

    employee = db.get(User, employee_id)
    if employee is None or employee.role != "employee" or not employee.is_active:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Employee not found")

    department = (employee.department or "").strip().lower()
    if not department or department not in _leadman_departments(current_user):
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="This employee is not deployed in your department")

    set_present(db, employee.id, state["workDate"], state["session"]["key"], payload.present, current_user.id)
    return _build_status(db, employee.department)


@router.put("/schedule", response_model=AttendanceStatus)
def set_attendance_schedule(
    payload: AttendanceScheduleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> AttendanceStatus:
    """GM switch: turn the time in / time out windows on, or off for demos
    (attendance then stays open all day and resets at midnight)."""
    if current_user.role not in {"gm", "admin"}:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Only the GM can change the attendance schedule")
    set_setting(db, ATTENDANCE_SCHEDULE_ENABLED, payload.enabled, updated_by=current_user.id)
    return _build_status(db, None)
