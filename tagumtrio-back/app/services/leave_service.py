from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from app.models.leave_request import LeaveRequest
from app.schemas.leave_request import LeaveRequestCreate, LeaveRequestPublic
from app.services.notification_service import create_notification, notify_role


def list_leave_requests(db: Session, employee_id: int | None = None, status: str | None = None) -> list[LeaveRequestPublic]:
    query = db.query(LeaveRequest)
    if employee_id is not None:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    if status:
        query = query.filter(LeaveRequest.status == status)
    rows = query.order_by(LeaveRequest.requested_at.desc()).all()
    # Return validated public schemas. Convert ORM objects to plain dicts
    # to avoid attribute/alias mismatches when validating with Pydantic.
    results: list[LeaveRequestPublic] = []
    for row in rows:
        data = {
            "id": row.id,
            "employeeId": row.employee_id,
            "employeeName": row.employee_name,
            "leaveType": row.leave_type,
            "reason": row.reason,
            "status": row.status,
            "requestedAt": row.requested_at,
            "approvedBy": row.approved_by,
            "approvedAt": row.approved_at,
            "note": row.note,
        }
        results.append(LeaveRequestPublic.model_validate(data))
    return results


def create_leave_request(db: Session, payload: LeaveRequestCreate) -> LeaveRequestPublic:
    record = LeaveRequest(
        id=_make_record_id("LEAVE"),
        employee_id=int(payload.employee_id),
        employee_name=payload.employee_name,
        leave_type=payload.leave_type,
        reason=payload.reason,
        status="pending",
        requested_at=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    notify_role(
        db,
        "gm",
        "leave_request_new",
        "New leave request",
        f"{record.employee_name} requested {record.leave_type} leave.",
        "/app/requests",
    )

    data = {
        "id": record.id,
        "employeeId": record.employee_id,
        "employeeName": record.employee_name,
        "leaveType": record.leave_type,
        "reason": record.reason,
        "status": record.status,
        "requestedAt": record.requested_at,
        "approvedBy": record.approved_by,
        "approvedAt": record.approved_at,
        "note": record.note,
    }
    return LeaveRequestPublic.model_validate(data)


def approve_leave_request(db: Session, request_id: str, approver_id: int | None = None, note: str | None = None) -> LeaveRequestPublic:
    record = db.get(LeaveRequest, request_id)
    if record is None:
        raise ValueError("Leave request not found.")
    record.status = "approved"
    record.approved_by = int(approver_id) if approver_id is not None else None
    record.approved_at = datetime.now(timezone.utc)
    record.note = note
    db.add(record)
    db.commit()
    db.refresh(record)

    create_notification(
        db,
        record.employee_id,
        "leave_request_status",
        "Leave request approved",
        f"Your {record.leave_type} leave request was approved.",
        "/app/portal/leaves",
    )

    data = {
        "id": record.id,
        "employeeId": record.employee_id,
        "employeeName": record.employee_name,
        "leaveType": record.leave_type,
        "reason": record.reason,
        "status": record.status,
        "requestedAt": record.requested_at,
        "approvedBy": record.approved_by,
        "approvedAt": record.approved_at,
        "note": record.note,
    }
    return LeaveRequestPublic.model_validate(data)


def reject_leave_request(db: Session, request_id: str, approver_id: int | None = None, note: str | None = None) -> LeaveRequestPublic:
    record = db.get(LeaveRequest, request_id)
    if record is None:
        raise ValueError("Leave request not found.")
    record.status = "rejected"
    record.approved_by = int(approver_id) if approver_id is not None else None
    record.approved_at = datetime.now(timezone.utc)
    record.note = note
    db.add(record)
    db.commit()
    db.refresh(record)

    create_notification(
        db,
        record.employee_id,
        "leave_request_status",
        "Leave request rejected",
        f"Your {record.leave_type} leave request was rejected.",
        "/app/portal/leaves",
    )

    data = {
        "id": record.id,
        "employeeId": record.employee_id,
        "employeeName": record.employee_name,
        "leaveType": record.leave_type,
        "reason": record.reason,
        "status": record.status,
        "requestedAt": record.requested_at,
        "approvedBy": record.approved_by,
        "approvedAt": record.approved_at,
        "note": record.note,
    }
    return LeaveRequestPublic.model_validate(data)


def _make_record_id(prefix: str) -> str:
    token = uuid.uuid4().hex[:10].upper()
    return f"{prefix}-{token}"
