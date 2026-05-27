from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.schemas.daily_report import DailyReportCreate, DailyReportPublic
from app.services.daily_report_service import create_daily_report, list_daily_reports

router = APIRouter(prefix="/daily-reports", tags=["daily-reports"])


@router.post("", response_model=DailyReportPublic)
def post_daily_report(payload: DailyReportCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # any authenticated leadman/production/finance/hr can submit
    if current_user.role not in {"leadman", "production_incharge", "hr", "finance", "admin"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return create_daily_report(db, payload)


@router.get("", response_model=list[DailyReportPublic])
def get_daily_reports(department: str | None = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # allow finance/hr/admin/production_incharge to list all; leadman constrained by department
    if current_user.role in {"finance", "hr", "admin", "production_incharge"}:
        return list_daily_reports(db, department=department)
    # for leadman return only matching department
    if current_user.role == 'leadman':
        dept = current_user.department
        return list_daily_reports(db, department=dept)
    raise HTTPException(status_code=403, detail="Insufficient permissions")
