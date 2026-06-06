from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.schemas.daily_report import DailyReportCreate, DailyReportPublic, DailyReportUpdate
from app.services.daily_report_service import create_daily_report, list_daily_reports, update_daily_report

router = APIRouter(prefix="/daily-reports", tags=["daily-reports"])


@router.post("", response_model=DailyReportPublic)
def post_daily_report(payload: DailyReportCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # any authenticated leadman/production/finance/hr can submit
    if current_user.role not in {"leadman", "production_incharge", "hr", "finance", "admin", "gm"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return create_daily_report(db, payload)


@router.get("", response_model=list[DailyReportPublic])
def get_daily_reports(
    department: str | None = Query(default=None),
    report_date: str | None = Query(default=None, alias="reportDate"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    # allow finance/hr/admin/production_incharge to list all; leadman constrained by department(s)
    if current_user.role in {"finance", "hr", "admin", "production_incharge" , "gm"}:
        return list_daily_reports(db, department=department, report_date=report_date)

    if current_user.role == 'leadman':
        allowed_departments = [d for d in (current_user.departments or []) if d] or ([current_user.department] if current_user.department else [])
        if department and department in allowed_departments:
            return list_daily_reports(db, department=department, report_date=report_date)
        if len(allowed_departments) == 1:
            return list_daily_reports(db, department=allowed_departments[0], report_date=report_date)
        return list_daily_reports(db, department=allowed_departments, report_date=report_date)

    raise HTTPException(status_code=403, detail="Insufficient permissions")


@router.patch("/{report_id}", response_model=DailyReportPublic)
def patch_daily_report(report_id: str, payload: DailyReportUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    allowed_roles = {"leadman", "production_incharge", "hr", "finance", "admin" , "gm"}
    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    try:
                return update_daily_report(db, report_id, payload)
    except ValueError as exc:
                raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
