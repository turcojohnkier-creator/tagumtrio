from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.schemas.attendance import AttendanceCreate, AttendancePublic
from app.services.attendance_service import create_attendance, list_attendance, verify_attendance_by_leadman, verify_attendance_by_head

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("", response_model=list[AttendancePublic])
def get_attendance(
    db: Session = Depends(get_db),
    employee_id: int | None = Query(default=None, alias="employeeId"),
    department: str | None = Query(default=None),
    status: str | None = Query(default=None),
    _current_user = Depends(get_current_user),
) -> list[AttendancePublic]:
    current_user = _current_user
    # employees can only view their own records
    if current_user.role == "employee":
        employee_id = current_user.id

    return list_attendance(db, employee_id=employee_id, department=department, status=status)


@router.post("", response_model=AttendancePublic)
def post_attendance(payload: AttendanceCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)) -> AttendancePublic:
    # Any authenticated user (leadman device) can create attendance records
    return create_attendance(db, payload)


@router.patch("/{record_id}/verify-leadman", response_model=AttendancePublic)
def patch_verify_leadman(record_id: str, leadman_id: int | None = Query(default=None, alias="leadmanId"), db: Session = Depends(get_db), current_user = Depends(get_current_user)) -> AttendancePublic:
    if current_user.role not in {"leadman", "production_incharge", "hr", "admin"}:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    if leadman_id is None:
        leadman_id = current_user.id
    return verify_attendance_by_leadman(db, record_id, leadman_id)


@router.patch("/{record_id}/verify-head", response_model=AttendancePublic)
def patch_verify_head(record_id: str, head_id: int | None = Query(default=None, alias="headId"), db: Session = Depends(get_db), current_user = Depends(get_current_user)) -> AttendancePublic:
    if current_user.role not in {"production_incharge", "hr", "admin"}:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    if head_id is None:
        head_id = current_user.id
    return verify_attendance_by_head(db, record_id, head_id)
