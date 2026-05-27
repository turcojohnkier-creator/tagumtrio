from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord
from app.schemas.attendance import AttendanceCreate, AttendancePublic, AttendanceUpdate


def list_attendance(
    db: Session,
    employee_id: int | None = None,
    department: str | None = None,
    status: str | None = None,
) -> list[AttendancePublic]:
    query = db.query(AttendanceRecord)
    if employee_id is not None:
        query = query.filter(AttendanceRecord.employee_id == employee_id)
    if department:
        query = query.filter(AttendanceRecord.department == department)
    if status:
        query = query.filter(AttendanceRecord.status == status)
    rows = query.order_by(AttendanceRecord.scanned_at.desc()).all()
    return [AttendancePublic.model_validate(row, from_attributes=True) for row in rows]


def create_attendance(db: Session, payload: AttendanceCreate) -> AttendancePublic:
    # Prevent duplicate attendance records when the same scan is submitted multiple times.
    existing = db.query(AttendanceRecord).filter(
        AttendanceRecord.employee_id == payload.employee_id,
        AttendanceRecord.department == payload.department,
        AttendanceRecord.logged_hours == payload.logged_hours,
        AttendanceRecord.amount == payload.amount,
        AttendanceRecord.notes == payload.notes,
        AttendanceRecord.scanned_at == payload.scanned_at,
    ).first()
    if existing is not None:
        return AttendancePublic.model_validate(existing, from_attributes=True)

    record = AttendanceRecord(
        id=_make_record_id("ATD"),
        employee_id=int(payload.employee_id),
        employee_name=payload.employee_name,
        department=payload.department,
        logged_hours=payload.logged_hours,
        scanned_at=payload.scanned_at,
        leadman_id=int(payload.leadman_id) if payload.leadman_id is not None else None,
        leadman_verified_at=payload.leadman_verified_at,
        head_id=int(payload.head_id) if payload.head_id is not None else None,
        head_verified_at=payload.head_verified_at,
        status=payload.status,
        rate=payload.rate,
        amount=payload.amount,
        raw=payload.raw,
        notes=payload.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return AttendancePublic.model_validate(record, from_attributes=True)


def update_attendance(db: Session, record_id: str, payload: AttendanceUpdate) -> AttendancePublic:
    record = db.get(AttendanceRecord, record_id)
    if record is None:
        raise ValueError("Attendance record not found.")

    for field, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
        if value is not None:
            setattr(record, field, value)

    db.add(record)
    db.commit()
    db.refresh(record)
    return AttendancePublic.model_validate(record, from_attributes=True)


def verify_attendance_by_leadman(db: Session, record_id: str, leadman_id: int) -> AttendancePublic:
    return update_attendance(
        db,
        record_id,
        AttendanceUpdate(
            leadman_id=leadman_id,
            leadman_verified_at=datetime.now(timezone.utc),
            status="leadman_verified",
        ),
    )


def verify_attendance_by_head(db: Session, record_id: str, head_id: int) -> AttendancePublic:
    return update_attendance(
        db,
        record_id,
        AttendanceUpdate(
            head_id=head_id,
            head_verified_at=datetime.now(timezone.utc),
            status="head_verified",
        ),
    )


def _make_record_id(prefix: str) -> str:
    token = uuid.uuid4().hex[:10].upper()
    return f"{prefix}-{token}"
