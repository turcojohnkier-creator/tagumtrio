from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app import crud, schemas
from app.models.user import User
from app.schemas.user import UserPublic
from app.services.notification_service import create_notification, notify_leadmen_for_department

router = APIRouter(prefix="/employees", tags=["employees"])

# HR provisions accounts for floor/production staff only; GM and HR
# accounts are not self-service and are not in scope for HR's create-account flow.
HR_CREATABLE_ROLES = {"employee", "leadman", "production_incharge"}


@router.get("", response_model=list[UserPublic])
def list_employees(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role not in {"hr", "production_incharge", "leadman", "admin", "gm"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return db.query(User).order_by(User.name.asc()).all()


@router.post("", response_model=UserPublic)
def create_employee_account(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if current_user.role != "hr":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    if crud.normalize_role(payload.role) not in HR_CREATABLE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR can only create employee, leadman, or production in-charge accounts.",
        )
    if crud.get_user_by_identifier(db, payload.identifier):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Identifier already registered.")
    try:
        return crud.create_user(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{employee_id}", response_model=UserPublic)
def patch_employee(employee_id: int, payload: dict, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Only leadman (for their team), production head, GM, or admin can update employee assignments
    if current_user.role not in {"leadman", "production_incharge", "hr", "admin", "gm"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    existing = db.get(User, employee_id)
    old_department = existing.department if existing else None

    try:
        user = crud.update_user(db, employee_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    new_department = payload.get("department")
    if new_department and new_department != old_department:
        create_notification(
            db,
            user.id,
            "reassignment_employee",
            "Department reassigned",
            f"You were reassigned from {old_department or 'no department'} to {new_department}.",
            "/app/portal",
        )
        notify_leadmen_for_department(
            db,
            new_department,
            "reassignment_leadman",
            "Employee reassigned to your department",
            f"{user.name} was reassigned to {new_department}.",
            "/app/leadman/workers",
        )

    return user
