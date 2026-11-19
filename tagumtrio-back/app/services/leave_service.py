from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
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
            "startDate": row.start_date,
            "endDate": row.end_date,
            "reason": row.reason,
            "status": row.status,
            "requestedAt": row.requested_at,
            "approvedBy": row.approved_by,
            "approvedAt": row.approved_at,
            "note": row.note,
        }
        results.append(LeaveRequestPublic.model_validate(data))
    return results


# Each leave day uses one "attempt": 2 per month, and one request covers at
# most 2 consecutive days (a 2-day request uses both attempts).
MONTHLY_LEAVE_DAYS = 2
MAX_DAYS_PER_REQUEST = 2


def _parse_day(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def leave_days(start_date: str | None, end_date: str | None) -> int:
    """Calendar days a request covers (inclusive). Missing/odd dates count as 1."""
    start = _parse_day(start_date)
    end = _parse_day(end_date) or start
    if start is None or end is None or end < start:
        return 1
    return (end - start).days + 1


# The company runs on Philippine time (UTC+8, no DST).
MANILA = timezone(timedelta(hours=8))


def _start_of_manila_month(now: datetime) -> datetime:
    """Midnight on the 1st of the current month in Philippine time, so the
    monthly allowance resets at 12:00 AM PHT rather than 8:00 AM (UTC midnight)."""
    local = now.astimezone(MANILA)
    return local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def create_leave_request(db: Session, payload: LeaveRequestCreate) -> LeaveRequestPublic:
    now = datetime.now(timezone.utc)

    start = _parse_day(payload.start_date)
    if start is None:
        raise ValueError("Please choose the first day of your leave.")
    # A one-day leave may leave the end date empty.
    end = _parse_day(payload.end_date) or start
    if end < start:
        raise ValueError("The last day of leave can't be before the first day.")
    requested_days = (end - start).days + 1
    if requested_days > MAX_DAYS_PER_REQUEST:
        raise ValueError(f"A leave request can cover at most {MAX_DAYS_PER_REQUEST} consecutive days.")

    # Requests filed since the 1st of this month. Rejected ones give their
    # days back, so only pending and approved requests use up attempts.
    existing_this_month = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.employee_id == int(payload.employee_id),
            LeaveRequest.requested_at >= _start_of_manila_month(now),
            LeaveRequest.status != "rejected",
        )
        .all()
    )
    used_days = sum(leave_days(row.start_date, row.end_date) for row in existing_this_month)
    remaining = MONTHLY_LEAVE_DAYS - used_days
    if remaining <= 0:
        raise ValueError(f"You've used all {MONTHLY_LEAVE_DAYS} leave days for this month.")
    if requested_days > remaining:
        raise ValueError(f"You only have {remaining} leave day left this month. Choose a single day.")

    record = LeaveRequest(
        id=_make_record_id("LEAVE"),
        employee_id=int(payload.employee_id),
        employee_name=payload.employee_name,
        leave_type=payload.leave_type,
        start_date=start.isoformat(),
        end_date=end.isoformat(),
        reason=payload.reason,
        status="pending",
        requested_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # GM and Production In-Charge both review leave requests.
    for reviewer_role in ("gm", "production_incharge"):
        notify_role(
            db,
            reviewer_role,
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
        "startDate": record.start_date,
        "endDate": record.end_date,
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
        "startDate": record.start_date,
        "endDate": record.end_date,
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
        "startDate": record.start_date,
        "endDate": record.end_date,
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
