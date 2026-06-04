from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from app.models.daily_report import DailyReport
from app.schemas.daily_report import DailyReportCreate, DailyReportPublic, DailyReportUpdate


def _make_id(prefix: str) -> str:
    token = uuid.uuid4().hex[:10].upper()
    return f"{prefix}-{token}"


def create_daily_report(db: Session, payload: DailyReportCreate) -> DailyReportPublic:
    record = DailyReport(
        id=_make_id('DR'),
        department=payload.department,
        report_date=payload.reportDate,
        submitted_by=payload.submittedBy,
        submitted_by_name=payload.submittedByName,
        status=payload.status or 'submitted',
        summary=payload.summary,
        entries=[e.model_dump() if hasattr(e, 'model_dump') else e for e in (payload.entries or [])],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return DailyReportPublic.model_validate({
        "id": record.id,
        "department": record.department,
        "report_date": record.report_date,
        "submitted_by": record.submitted_by,
        "submitted_by_name": record.submitted_by_name,
        "status": record.status,
        "summary": record.summary,
        "entries": record.entries or [],
        "created_at": record.created_at,
    })


def list_daily_reports(db: Session, department: str | list[str] | None = None, report_date: str | None = None) -> list[DailyReportPublic]:
    query = db.query(DailyReport)
    if department:
        if isinstance(department, list):
            query = query.filter(DailyReport.department.in_(department))
        else:
            query = query.filter(DailyReport.department == department)
    if report_date:
        query = query.filter(DailyReport.report_date == report_date)
    rows = query.order_by(DailyReport.created_at.desc()).all()
    return [DailyReportPublic.model_validate({
        "id": row.id,
        "department": row.department,
        "report_date": row.report_date,
        "submitted_by": row.submitted_by,
        "submitted_by_name": row.submitted_by_name,
        "status": row.status,
        "summary": row.summary,
        "entries": row.entries or [],
        "created_at": row.created_at,
    }) for row in rows]


def update_daily_report(db: Session, report_id: str, payload: DailyReportUpdate) -> DailyReportPublic:
    record = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if record is None:
        raise ValueError("Daily report not found")

    record.status = payload.status
    if payload.notes:
        existing_summary = record.summary or ''
        if existing_summary and payload.notes not in existing_summary:
            record.summary = f"{existing_summary} • {payload.notes}".strip(' •')
        elif not existing_summary:
            record.summary = payload.notes

    db.add(record)
    db.commit()
    db.refresh(record)
    return DailyReportPublic.model_validate({
        "id": record.id,
        "department": record.department,
        "report_date": record.report_date,
        "submitted_by": record.submitted_by,
        "submitted_by_name": record.submitted_by_name,
        "status": record.status,
        "summary": record.summary,
        "entries": record.entries or [],
        "created_at": record.created_at,
    })
