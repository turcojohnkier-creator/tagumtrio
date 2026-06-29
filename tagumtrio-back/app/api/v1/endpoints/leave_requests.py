from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.schemas.leave_request import LeaveRequestCreate, LeaveRequestPublic, LeaveRequestApprove
from app.services.leave_service import create_leave_request, list_leave_requests, approve_leave_request
from app.services.leave_service import reject_leave_request

router = APIRouter(prefix="/leave-requests", tags=["leave-requests"])


@router.get("", response_model=list[LeaveRequestPublic])
def get_leave_requests(
    db: Session = Depends(get_db),
    employee_id: int | None = Query(default=None, alias="employeeId"),
    status: str | None = Query(default=None),
    _current_user = Depends(get_current_user),
) -> list[LeaveRequestPublic]:
    current_user = _current_user
    if current_user.role == "employee":
        employee_id = current_user.id
    return list_leave_requests(db, employee_id=employee_id, status=status)


@router.post("", response_model=LeaveRequestPublic)
def post_leave_request(payload: LeaveRequestCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)) -> LeaveRequestPublic:
    if current_user.role not in {"employee", "hr", "admin"}:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    try:
        return create_leave_request(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{request_id}/approve", response_model=LeaveRequestPublic)
def approve_leave_request_endpoint(request_id: str, payload: LeaveRequestApprove, db: Session = Depends(get_db), approver_id: int | None = Query(default=None, alias="approverId"), current_user = Depends(get_current_user)) -> LeaveRequestPublic:
    if current_user.role not in {"leadman", "production_incharge", "hr", "admin", "gm"}:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    approver = approver_id or current_user.id
    try:
        return approve_leave_request(db, request_id, approver_id=approver, note=payload.note)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{request_id}/reject", response_model=LeaveRequestPublic)
def reject_leave_request_endpoint(request_id: str, payload: LeaveRequestApprove, db: Session = Depends(get_db), approver_id: int | None = Query(default=None, alias="approverId"), current_user = Depends(get_current_user)) -> LeaveRequestPublic:
    if current_user.role not in {"leadman", "production_incharge", "hr", "admin", "gm"}:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    approver = approver_id or current_user.id
    try:
        return reject_leave_request(db, request_id, approver_id=approver, note=payload.note)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
