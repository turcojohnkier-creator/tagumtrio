from __future__ import annotations

from datetime import datetime
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.payroll_payment import PayrollPayment
from app.models.daily_report import DailyReport
from app.schemas.payroll import PayrollPaymentCreate, PayrollPaymentPublic, PayrollCycleSummary
import uuid


def _payroll_cycle_key(dt: datetime) -> str:
    cycle = '1' if dt.day <= 15 else '2'
    return f"{dt.year}-{str(dt.month).zfill(2)}-{cycle}"


def _payroll_cycle_label(dt: datetime) -> str:
    cycle = '1-15' if dt.day <= 15 else '16-end'
    return f"{dt.strftime('%B %Y')} • {cycle}"


def list_payroll_cycles(db: Session) -> list[PayrollCycleSummary]:
    rows = db.query(DailyReport).order_by(DailyReport.created_at.desc()).all()
    grouped = defaultdict(list)
    for report in rows:
        try:
            report_date = datetime.fromisoformat(report.report_date)
        except ValueError:
            continue
        key = _payroll_cycle_key(report_date)
        grouped[key].append(report)

    summaries = []
    for key, records in grouped.items():
        latest_report = max(records, key=lambda r: r.report_date)
        entries = []
        for report in records:
            entries.extend(report.entries or [])

        total_hours = sum(float(entry.get('loggedHours') or 0) for entry in entries)
        total_amount = sum(float(entry.get('amount') or 0) for entry in entries)
        employee_count = len({str(entry.get('employeeId') or entry.get('employeeName') or '') for entry in entries if (entry.get('employeeId') or entry.get('employeeName'))})
        report_date = datetime.fromisoformat(latest_report.report_date)
        label = _payroll_cycle_label(report_date)
        summaries.append(PayrollCycleSummary(key=key, label=label, totalHours=total_hours, totalAmount=total_amount, employeeCount=employee_count, latestDate=latest_report.created_at.isoformat()))

    summaries.sort(key=lambda s: s.latestDate, reverse=True)
    return summaries


def get_payroll_cycle_details(db: Session, cycle_key: str) -> list[dict]:
    # cycle_key format 'YYYY-MM-1' or 'YYYY-MM-2'
    year, month, cycle = cycle_key.split('-')
    year = int(year)
    month = int(month)
    from datetime import datetime
    if cycle == '1':
        start = datetime(year, month, 1)
        end = datetime(year, month, 15, 23, 59, 59)
    else:
        import calendar
        last = calendar.monthrange(year, month)[1]
        start = datetime(year, month, 16)
        end = datetime(year, month, last, 23, 59, 59)

    reports = db.query(DailyReport).all()
    records: list[dict] = []
    for report in reports:
        try:
            report_date = datetime.fromisoformat(report.report_date)
        except ValueError:
            continue
        if not (start <= report_date <= end):
            continue
        for entry in report.entries or []:
            records.append({
                'id': entry.get('id') or f"{report.id}-{len(records)}",
                'employeeId': entry.get('employeeId'),
                'employeeName': entry.get('employeeName'),
                'department': entry.get('department') or report.department,
                'loggedHours': entry.get('loggedHours') or 0,
                'scannedAt': report_date.isoformat(),
                'amount': entry.get('amount') or 0,
                'reportId': report.id,
                'reportDate': report.report_date,
            })

    records.sort(key=lambda item: item['scannedAt'], reverse=True)
    return records


def list_payroll_payments(db: Session) -> list[PayrollPaymentPublic]:
    rows = db.query(PayrollPayment).order_by(PayrollPayment.created_at.desc()).all()
    return [PayrollPaymentPublic.model_validate(r, from_attributes=True) for r in rows]


def release_payroll_for_cycle(db: Session, cycle_key: str, released_by: int | None = None) -> list[PayrollPaymentPublic]:
    details = get_payroll_cycle_details(db, cycle_key)
    # aggregate per employee
    per_employee = defaultdict(float)
    for r in details:
        per_employee[r['employeeId']] += float(r.get('amount') or 0)

    created = []
    for emp_id, amount in per_employee.items():
        p = PayrollPayment(
            id=_make_id('PAY'),
            employee_id=emp_id,
            period=cycle_key,
            amount=amount,
            released_at=datetime.utcnow(),
            released_by=released_by,
        )
        db.add(p)
        created.append(p)

    db.commit()
    for p in created:
        db.refresh(p)

    return [PayrollPaymentPublic.model_validate(p, from_attributes=True) for p in created]


def _make_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"
