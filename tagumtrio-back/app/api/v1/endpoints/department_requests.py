from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.schemas.department_request import DepartmentRequestCreate, DepartmentRequestPublic, DepartmentRequestRedirect
from app.services.department_request_service import approve_department_request, create_department_request, list_department_requests, redirect_department_request

router = APIRouter(prefix="/department-requests", tags=["department-requests"])


@router.get("", response_model=list[DepartmentRequestPublic])
def get_department_requests(
    db: Session = Depends(get_db),
    department: str | None = Query(default=None),
    employee_id: int | None = Query(default=None, alias="employeeId"),
    request_status: str | None = Query(default=None, alias="status"),
    _current_user = Depends(get_current_user),
) -> list[DepartmentRequestPublic]:
    current_user = _current_user
    if current_user.role == "employee":
        employee_id = current_user.id
        department = None
    elif current_user.role == "leadman":
        allowed_departments = [d for d in (current_user.departments or []) if d] or ([current_user.department] if current_user.department else [])
        if department and department not in allowed_departments:
            department = None
    elif current_user.role not in {"hr", "admin", "production_incharge", "leadman"}:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    requests = list_department_requests(db, department=department, employee_id=employee_id, status=request_status)
    if current_user.role == "leadman":
        allowed_departments = [d for d in (current_user.departments or []) if d] or ([current_user.department] if current_user.department else [])
        requests = [request for request in requests if request.requested_department in allowed_departments]
    return requests


@router.post("", response_model=DepartmentRequestPublic)
def post_department_request(
    payload: DepartmentRequestCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
) -> DepartmentRequestPublic:
    if current_user.role not in {"employee", "hr", "admin"}:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return create_department_request(db, payload)


@router.patch("/{request_id}/approve", response_model=DepartmentRequestPublic)
def approve_department_request_endpoint(
    request_id: str,
    db: Session = Depends(get_db),
    leadman_id: int | None = Query(default=None, alias="leadmanId"),
    current_user = Depends(get_current_user),
) -> DepartmentRequestPublic:
    if current_user.role not in {"hr", "admin", "leadman", "production_incharge"}:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    try:
        return approve_department_request(db, request_id, leadman_id=leadman_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{request_id}/redirect", response_model=DepartmentRequestPublic)
def redirect_department_request_endpoint(
    request_id: str,
    payload: DepartmentRequestRedirect,
    db: Session = Depends(get_db),
    leadman_id: int | None = Query(default=None, alias="leadmanId"),
    current_user = Depends(get_current_user),
) -> DepartmentRequestPublic:
    if current_user.role not in {"hr", "admin", "leadman", "production_incharge"}:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    try:
        return redirect_department_request(
            db,
            request_id,
            target_department=payload.target_department,
            leadman_id=leadman_id,
            note=payload.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc