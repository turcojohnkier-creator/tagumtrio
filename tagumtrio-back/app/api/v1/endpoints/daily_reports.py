from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.models.daily_report import DailyReport
from app.schemas.daily_report import DailyReportCreate, DailyReportPublic, DailyReportResubmit, DailyReportUpdate
from app.services.daily_report_service import (
    approve_daily_report,
    create_daily_report,
    list_daily_reports,
    list_daily_reports_for_employee,
    resubmit_daily_report,
    update_daily_report,
)

router = APIRouter(prefix="/daily-reports", tags=["daily-reports"])

VERIFICATION_STATUSES = {"leadman_verified", "rejected"}
PRODUCTION_INCHARGE_STATUSES = {"compiled", "gm_submitted"}


@router.post("", response_model=DailyReportPublic)
def post_daily_report(payload: DailyReportCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # any authenticated leadman/production/hr can submit
    if current_user.role not in {"leadman", "production_incharge", "hr", "admin", "gm"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return create_daily_report(db, payload)


@router.get("", response_model=list[DailyReportPublic])
def get_daily_reports(
    department: str | None = Query(default=None),
    report_date: str | None = Query(default=None, alias="reportDate"),
    target_department: str | None = Query(default=None, alias="targetDepartment"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    # allow hr/admin/production_incharge/gm to list all; leadman constrained by department(s)
    if current_user.role in {"hr", "admin", "production_incharge", "gm"}:
        return list_daily_reports(db, department=department, report_date=report_date, target_department=target_department)

    if current_user.role == 'leadman':
        allowed_departments = [d for d in (current_user.departments or []) if d] or ([current_user.department] if current_user.department else [])

        # Incoming-for-verification queue: reports targeting one of this leadman's departments.
        if target_department:
            if target_department not in allowed_departments:
                raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
            return list_daily_reports(db, report_date=report_date, target_department=target_department)

        if department and department in allowed_departments:
            return list_daily_reports(db, department=department, report_date=report_date)
        if len(allowed_departments) == 1:
            return list_daily_reports(db, department=allowed_departments[0], report_date=report_date)
        return list_daily_reports(db, department=allowed_departments, report_date=report_date)

    if current_user.role == 'employee':
        return list_daily_reports_for_employee(db, current_user.id)

    raise HTTPException(status_code=403, detail="Insufficient permissions")


@router.patch("/{report_id}", response_model=DailyReportPublic)
def patch_daily_report(report_id: str, payload: DailyReportUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    allowed_roles = {"leadman", "production_incharge", "hr", "admin", "gm"}
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    if payload.status in VERIFICATION_STATUSES:
        record = db.query(DailyReport).filter(DailyReport.id == report_id).first()
        if record is None:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Daily report not found")
        allowed_departments = current_user.departments or ([current_user.department] if current_user.department else [])
        if current_user.role != "leadman" or record.target_department not in allowed_departments:
            raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Only the target department's leadman can verify or reject this report")

    if payload.status in PRODUCTION_INCHARGE_STATUSES and current_user.role != "production_incharge":
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Only production in-charge can advance a report to this stage")

    try:
        return update_daily_report(db, report_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{report_id}/resubmit", response_model=DailyReportPublic)
def patch_resubmit_daily_report(report_id: str, payload: DailyReportResubmit, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role != "leadman":
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    try:
        return resubmit_daily_report(db, report_id, payload, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{report_id}/approve", response_model=DailyReportPublic)
def patch_approve_daily_report(report_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role != "gm":
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    try:
        return approve_daily_report(db, report_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
