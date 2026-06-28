"""One-off wipe of test data so the system can be tested with a clean slate.

Deletes all rows from daily_reports, leave_requests, notifications, and
payroll_payments. Leaves users, piece_rates, and announcements untouched.

Run with: python -m scripts.wipe_records
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.models.daily_report import DailyReport
from app.models.leave_request import LeaveRequest
from app.models.notification import Notification
from app.models.payroll_payment import PayrollPayment


def main() -> None:
    db = SessionLocal()
    try:
        deleted = {
            "daily_reports": db.query(DailyReport).delete(),
            "leave_requests": db.query(LeaveRequest).delete(),
            "notifications": db.query(Notification).delete(),
            "payroll_payments": db.query(PayrollPayment).delete(),
        }
        db.commit()
        for table, count in deleted.items():
            print(f"Deleted {count} rows from {table}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
