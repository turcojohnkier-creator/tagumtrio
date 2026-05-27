from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.department_request import DepartmentRequest
from app.models.user import User
from app.schemas.department_request import DepartmentRequestCreate, DepartmentRequestPublic


def list_department_requests(
    db: Session,
    department: str | None = None,
    employee_id: int | None = None,
    status: str | None = None,
) -> list[DepartmentRequestPublic]:
    query = db.query(DepartmentRequest)
    if department:
        query = query.filter(DepartmentRequest.requested_department == department)
    if employee_id is not None:
        query = query.filter(DepartmentRequest.employee_id == employee_id)
    if status:
        query = query.filter(DepartmentRequest.status == status)
    items = query.order_by(DepartmentRequest.requested_at.desc()).all()
    return [DepartmentRequestPublic.model_validate(item, from_attributes=True) for item in items]


def create_department_request(db: Session, payload: DepartmentRequestCreate) -> DepartmentRequestPublic:
    employee_id = int(payload.employee_id)
    employee_name = payload.employee_name.strip()
    requested_department = payload.requested_department.strip()

    existing = (
        db.query(DepartmentRequest)
        .filter(
            DepartmentRequest.employee_id == employee_id,
            DepartmentRequest.requested_department == requested_department,
            DepartmentRequest.status == "pending",
        )
        .order_by(DepartmentRequest.requested_at.desc())
        .first()
    )
    if existing is not None:
        return DepartmentRequestPublic.model_validate(existing, from_attributes=True)

    item = DepartmentRequest(
        id=f"REQ-{uuid.uuid4().hex[:12].upper()}",
        employee_id=employee_id,
        employee_name=employee_name,
        requested_department=requested_department,
        status="pending",
        requested_at=datetime.now(timezone.utc),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return DepartmentRequestPublic.model_validate(item, from_attributes=True)


def approve_department_request(db: Session, request_id: str, leadman_id: int | None = None) -> DepartmentRequestPublic:
    item = db.get(DepartmentRequest, request_id)
    if item is None:
        raise ValueError("Transfer request not found.")

    now = datetime.now(timezone.utc)
    item.status = "approved"
    item.leadman_id = int(leadman_id) if leadman_id is not None else None
    item.leadman_at = now

    employee = db.get(User, item.employee_id)
    if employee is not None:
        employee.department = item.requested_department
        employee.departments = [item.requested_department]
        db.add(employee)

    db.add(item)
    db.commit()
    db.refresh(item)
    return DepartmentRequestPublic.model_validate(item, from_attributes=True)


def redirect_department_request(
    db: Session,
    request_id: str,
    target_department: str,
    leadman_id: int | None = None,
    note: str | None = None,
) -> DepartmentRequestPublic:
    item = db.get(DepartmentRequest, request_id)
    if item is None:
        raise ValueError("Transfer request not found.")

    normalized_target = target_department.strip()
    if not normalized_target:
        raise ValueError("Target department is required.")

    now = datetime.now(timezone.utc)
    source_department = item.requested_department
    item.status = "redirected"
    item.leadman_id = int(leadman_id) if leadman_id is not None else None
    item.leadman_at = now
    item.note = (note.strip() if note else None) or f"Redirected from {source_department} to {normalized_target} by leadman."

    redirected_item = DepartmentRequest(
        id=f"REQ-{uuid.uuid4().hex[:12].upper()}",
        employee_id=item.employee_id,
        employee_name=item.employee_name,
        requested_department=normalized_target,
        status="pending",
        requested_at=now,
        note=item.note,
    )

    db.add(item)
    db.add(redirected_item)
    db.commit()
    db.refresh(redirected_item)
    return DepartmentRequestPublic.model_validate(redirected_item, from_attributes=True)