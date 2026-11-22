from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
import uuid
from urllib.parse import quote

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.daily_report import DailyReport
from app.models.payroll_payment import PayrollPayment
from app.schemas.daily_report import DailyReportCreate, DailyReportPublic, DailyReportResubmit, DailyReportUpdate
from app.services.notification_service import create_notification, notify_leadmen_for_department, notify_role
from app.services.report_photos import restore_photos, store_photos


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
        "verified_by": record.verified_by,
        "verified_at": record.verified_at,
        "compiled_by": record.compiled_by,
        "compiled_at": record.compiled_at,
        "approved_by": record.approved_by,
        "approved_at": record.approved_at,
        "return_history": list(record.return_history or []),
    })


def _report_label(record: DailyReport) -> str:
    """e.g. "Rotary report for 2026-11-19" — used in notification messages."""
    return f"{record.department} report for {record.report_date}"


def _leadman_link(tab: str, department: str | None) -> str:
    """Deep link into Incoming Reports, opened on the right department and tab
    (a leadman handling several departments sees one department at a time)."""
    query = f"tab={tab}"
    if department:
        query += f"&department={quote(department)}"
    return f"/app/leadman/reports?{query}"


def _notify_ready_to_compile(db: Session, record: DailyReport) -> None:
    # Production in-charge compiles every verified report. Deduped so a batch of
    # verifications for the same department/day shows up once.
    notify_role(
        db,
        "production_incharge",
        "daily_report_ready_to_compile",
        "Report ready to compile",
        f"The {_report_label(record)} was verified and is ready to compile.",
        "/app/production",
        dedupe=True,
    )


def create_daily_report(db: Session, payload: DailyReportCreate) -> DailyReportPublic:
    report_id = _make_id('DR')
    entries = [e.model_dump() if hasattr(e, 'model_dump') else e for e in (payload.entries or [])]
    record = DailyReport(
        id=report_id,
        department=payload.department,
        target_department=payload.targetDepartment,
        report_date=payload.reportDate,
        submitted_by=payload.submittedBy,
        submitted_by_name=payload.submittedByName,
        status=_initial_status(payload.targetDepartment),
        summary=payload.summary,
        entries=store_photos(db, report_id, entries),
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
            f"A report from {record.department} is awaiting {record.target_department}'s verification.",
            _leadman_link("incoming", record.target_department),
        )
    else:
        # End of the department chain: no verification step, straight to compile.
        _notify_ready_to_compile(db, record)

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


def _entry_belongs_to(entry, employee_id: int) -> bool:
    return isinstance(entry, dict) and str(entry.get('employeeId')) == str(employee_id)


HISTORY_ROLES = {"employee", "leadman", "production_incharge", "gm"}


def list_report_history(db: Session, user, limit: int = 100) -> list[DailyReportPublic]:
    """Recent reports the given user took part in, scoped by role.

    - employee: reports they appear in (any stage except rejected), with
      entries trimmed to their own rows so coworkers' pay stays private
    - leadman: reports they submitted, plus reports they verified/rejected
    - production_incharge: reports they compiled
    - gm: reports they approved
    """
    role = getattr(user, 'role', None)
    query = db.query(DailyReport)

    if role == 'employee':
        # Reports sent back to the leadman are being corrected; hide them until resubmitted.
        rows = query.filter(DailyReport.status.notin_(list(RESUBMITTABLE_STATUSES))).order_by(DailyReport.created_at.desc()).all()
        result: list[DailyReportPublic] = []
        for row in rows:
            own_entries = [entry for entry in (row.entries or []) if _entry_belongs_to(entry, user.id)]
            if not own_entries:
                continue
            public = _to_public(row)
            public.entries = own_entries
            result.append(public)
            if len(result) >= limit:
                break
        return result

    if role == 'leadman':
        query = query.filter(
            or_(DailyReport.submitted_by == user.id, DailyReport.verified_by == user.id)
        ).order_by(DailyReport.created_at.desc())
    elif role == 'production_incharge':
        query = query.filter(DailyReport.compiled_by == user.id).order_by(DailyReport.compiled_at.desc())
    elif role == 'gm':
        query = query.filter(DailyReport.approved_by == user.id).order_by(DailyReport.approved_at.desc())
    else:
        return []

    return [_to_public(row) for row in query.limit(limit).all()]


def update_daily_report(db: Session, report_id: str, payload: DailyReportUpdate, actor_id: int | None = None) -> DailyReportPublic:
    record = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if record is None:
        raise ValueError("Daily report not found")

    record.status = payload.status
    if payload.status in ('leadman_verified', 'rejected'):
        record.verified_by = actor_id
        record.verified_at = datetime.now(timezone.utc)
    if payload.status == 'compiled':
        record.compiled_by = actor_id
        record.compiled_at = datetime.now(timezone.utc)
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
            _leadman_link("rejected", record.department),
        )
    elif payload.status == 'leadman_verified':
        _notify_ready_to_compile(db, record)
        create_notification(
            db,
            record.submitted_by,
            "daily_report_verified",
            "Report verified",
            f"Your {_report_label(record)} was verified by {record.target_department or 'the next department'}.",
            "/app/leadman/history",
            dedupe=True,
        )
    elif payload.status == 'gm_submitted':
        notify_role(
            db,
            "gm",
            "daily_report_gm_pending",
            "Report pending approval",
            f"A compiled {_report_label(record)} is awaiting your approval.",
            "/app/production/consolidated",
            dedupe=True,
        )

    return _to_public(record)


def resubmit_daily_report(db: Session, report_id: str, payload: DailyReportResubmit, current_user_id: int | None) -> DailyReportPublic:
    record = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if record is None:
        raise ValueError("Daily report not found")
    if record.status not in RESUBMITTABLE_STATUSES:
        raise ValueError("Only rejected or returned reports can be resubmitted")
    if record.submitted_by != current_user_id:
        raise ValueError("Only the original submitting leadman can resubmit this report")

    record.department = payload.department
    record.target_department = payload.targetDepartment
    record.summary = payload.summary
    # The form sends back the photo URLs it was shown; keep pointing them at
    # the stored photos, and store any newly attached ones.
    new_entries = [e.model_dump() if hasattr(e, 'model_dump') else e for e in (payload.entries or [])]
    record.entries = store_photos(db, record.id, restore_photos(new_entries, record.entries))
    record.status = _initial_status(payload.targetDepartment)
    # The rejection/return is undone — the report goes through the whole flow
    # again (next-department verification -> compile -> GM). return_history
    # is kept so later stages can still see why it bounced.
    record.verified_by = None
    record.verified_at = None
    record.compiled_by = None
    record.compiled_at = None

    db.add(record)
    db.commit()
    db.refresh(record)

    if record.target_department:
        notify_leadmen_for_department(
            db,
            record.target_department,
            "daily_report_incoming",
            "New report awaiting verification",
            f"A resubmitted report from {record.department} is awaiting {record.target_department}'s verification.",
            _leadman_link("incoming", record.target_department),
        )
    else:
        _notify_ready_to_compile(db, record)

    return _to_public(record)


# rejected = sent back by the next department's leadman
# returned = sent back by production in-charge (usually after a GM return)
RESUBMITTABLE_STATUSES = {'rejected', 'returned'}

# Who may return a report, from which status, and where it goes.
RETURN_RULES = {
    'gm': {'from': 'gm_submitted', 'to': 'gm_returned'},
    'production_incharge': {'from': 'gm_returned', 'to': 'returned'},
}

# Production in-charge may (re)send a report to the GM only from these.
GM_SUBMITTABLE_FROM = {'compiled', 'gm_returned'}


def return_daily_report(db: Session, report_id: str, reason: str, actor) -> DailyReportPublic:
    """Send a report one step back up the chain, with a required reason.

    GM -> production in-charge (gm_submitted -> gm_returned), then
    production in-charge -> the leadman who submitted it (gm_returned -> returned).
    """
    rule = RETURN_RULES.get(getattr(actor, 'role', None))
    if rule is None:
        raise PermissionError("Only the GM or production in-charge can return a report")

    record = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if record is None:
        raise LookupError("Daily report not found")
    if record.status != rule['from']:
        if actor.role == 'gm':
            raise ValueError("Only reports pending GM approval can be returned")
        raise ValueError("Only reports returned by the GM can be sent back to the leadman")

    # Reassign (not append in place) so SQLAlchemy sees the JSON change.
    record.return_history = list(record.return_history or []) + [{
        "byRole": actor.role,
        "byId": actor.id,
        "byName": actor.name,
        "reason": reason,
        "at": datetime.now(timezone.utc).isoformat(),
    }]
    record.status = rule['to']
    db.add(record)
    db.commit()
    db.refresh(record)

    if actor.role == 'gm':
        notify_role(
            db,
            "production_incharge",
            "daily_report_gm_returned",
            "Report returned by GM",
            f"{record.department} ({record.report_date}): {reason}",
            "/app/production/returned",
        )
    elif record.submitted_by is not None:
        create_notification(
            db,
            record.submitted_by,
            "daily_report_rejected",
            "Report returned by Production In-Charge",
            f"{record.department} ({record.report_date}): {reason}",
            _leadman_link("rejected", record.department),
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
        report_date = datetime.now(timezone(timedelta(hours=8)))  # Philippine time
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
    record.approved_by = approved_by
    record.approved_at = datetime.now(timezone.utc)
    db.add(record)
    db.commit()
    db.refresh(record)

    # Deduped: approving a bundle approves each of its reports, but the leadman
    # and each employee should hear about that department/day only once.
    create_notification(
        db,
        record.submitted_by,
        "daily_report_approved",
        "Report approved",
        f"The GM approved your {_report_label(record)}. Payroll has been released.",
        "/app/leadman/history",
        dedupe=True,
    )
    for employee_id in per_employee:
        try:
            recipient_id = int(employee_id)
        except (TypeError, ValueError):
            continue
        create_notification(
            db,
            recipient_id,
            "payslip_released",
            "Payslip ready",
            f"Your pay for {record.report_date} has been released. Check your payslip.",
            "/app/portal/payslips",
            dedupe=True,
        )

    return _to_public(record)
