from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
import uuid

from sqlalchemy.orm import Session

from app.models.daily_report import DailyReport
from app.models.payroll_payment import PayrollPayment
from app.schemas.daily_report import DailyReportCreate, DailyReportPublic, DailyReportResubmit, DailyReportUpdate
from app.services.notification_service import create_notification, notify_leadmen_for_department, notify_role


def _make_id(prefix: str) -> str:
    token = uuid.uuid4().hex[:10].upper()
    return f"{prefix}-{token}"


def _payroll_cycle_key(dt: datetime) -> str:
    cycle = '1' if dt.day <= 15 else '2'
    return f"{dt.year}-{str(dt.month).zfill(2)}-{cycle}"


def _initial_status(target_department: str | None) -> str:
    # No next department in the flow graph (chain end) skips the verification step.
    return 'submitted' if target_department else 'leadman_verified'


def _to_public(record: DailyReport) -> DailyReportPublic:
    return DailyReportPublic.model_validate({
        "id": record.id,
        "department": record.department,
        "target_department": record.target_department,
        "report_date": record.report_date,
        "submitted_by": record.submitted_by,
        "submitted_by_name": record.submitted_by_name,
        "status": record.status,
        "summary": record.summary,
        "entries": record.entries or [],
        "created_at": record.created_at,
    })


def create_daily_report(db: Session, payload: DailyReportCreate) -> DailyReportPublic:
    record = DailyReport(
        id=_make_id('DR'),
        department=payload.department,
        target_department=payload.targetDepartment,
        report_date=payload.reportDate,
        submitted_by=payload.submittedBy,
        submitted_by_name=payload.submittedByName,
        status=_initial_status(payload.targetDepartment),
        summary=payload.summary,
        entries=[e.model_dump() if hasattr(e, 'model_dump') else e for e in (payload.entries or [])],
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    if record.target_department:
        notify_leadmen_for_department(
            db,
            record.target_department,
            "daily_report_incoming",
            "New report awaiting verification",
            f"A report from {record.department} is awaiting your verification.",
            "/app/leadman/reports",
        )

    return _to_public(record)


def list_daily_reports(
    db: Session,
    department: str | list[str] | None = None,
    report_date: str | None = None,
    target_department: str | None = None,
) -> list[DailyReportPublic]:
    query = db.query(DailyReport)
    if department:
        if isinstance(department, list):
            query = query.filter(DailyReport.department.in_(department))
        else:
            query = query.filter(DailyReport.department == department)
    if target_department:
        query = query.filter(DailyReport.target_department == target_department)
    if report_date:
        query = query.filter(DailyReport.report_date == report_date)
    rows = query.order_by(DailyReport.created_at.desc()).all()
    return [_to_public(row) for row in rows]


def list_daily_reports_for_employee(db: Session, employee_id: int) -> list[DailyReportPublic]:
    # Employees only ever see their own *approved* (payroll-released) reports —
    # never pending work, and never other employees' entries within a shared report.
    rows = db.query(DailyReport).filter(DailyReport.status == 'approved').order_by(DailyReport.created_at.desc()).all()
    matching = [row for row in rows if any(str(entry.get('employeeId')) == str(employee_id) for entry in (row.entries or []))]
    return [_to_public(row) for row in matching]


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

    if payload.status == 'rejected':
        create_notification(
            db,
            record.submitted_by,
            "daily_report_rejected",
            "Report rejected",
            payload.notes or f"Your report for {record.department} was rejected. Edit and resubmit it.",
            "/app/leadman/history",
        )
    elif payload.status == 'gm_submitted':
        notify_role(
            db,
            "gm",
            "daily_report_gm_pending",
            "Report pending approval",
            f"A compiled report for {record.department} is awaiting your approval.",
            "/app/production/consolidated",
        )

    return _to_public(record)


def resubmit_daily_report(db: Session, report_id: str, payload: DailyReportResubmit, current_user_id: int | None) -> DailyReportPublic:
    record = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if record is None:
        raise ValueError("Daily report not found")
    if record.status != 'rejected':
        raise ValueError("Only rejected reports can be resubmitted")
    if record.submitted_by != current_user_id:
        raise ValueError("Only the original submitting leadman can resubmit this report")

    record.department = payload.department
    record.target_department = payload.targetDepartment
    record.summary = payload.summary
    record.entries = [e.model_dump() if hasattr(e, 'model_dump') else e for e in (payload.entries or [])]
    record.status = _initial_status(payload.targetDepartment)

    db.add(record)
    db.commit()
    db.refresh(record)

    if record.target_department:
        notify_leadmen_for_department(
            db,
            record.target_department,
            "daily_report_incoming",
            "New report awaiting verification",
            f"A resubmitted report from {record.department} is awaiting your verification.",
            "/app/leadman/reports",
        )

    return _to_public(record)


def approve_daily_report(db: Session, report_id: str, approved_by: int | None) -> DailyReportPublic:
    record = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if record is None:
        raise ValueError("Daily report not found")
    if record.status != 'gm_submitted':
        raise ValueError("Only reports submitted to GM can be approved")

    try:
        report_date = datetime.fromisoformat(record.report_date)
    except ValueError:
        report_date = datetime.now(timezone.utc)
    period = _payroll_cycle_key(report_date)

    per_employee: dict[int, float] = defaultdict(float)
    for entry in record.entries or []:
        employee_id = entry.get('employeeId')
        if employee_id is None:
            continue
        per_employee[employee_id] += float(entry.get('amount') or 0)

    for employee_id, amount in per_employee.items():
        db.add(PayrollPayment(
            id=_make_id('PAY'),
            employee_id=employee_id,
            period=period,
            amount=amount,
            released_at=datetime.now(timezone.utc),
            released_by=approved_by,
        ))

    record.status = 'approved'
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_public(record)
