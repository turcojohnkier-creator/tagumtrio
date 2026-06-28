from __future__ import annotations

from sqlalchemy.orm import Session
from app.models.payroll_payment import PayrollPayment
from app.schemas.payroll import PayrollPaymentPublic


def list_payroll_payments(db: Session) -> list[PayrollPaymentPublic]:
    rows = db.query(PayrollPayment).order_by(PayrollPayment.created_at.desc()).all()
    return [PayrollPaymentPublic.model_validate(r, from_attributes=True) for r in rows]
