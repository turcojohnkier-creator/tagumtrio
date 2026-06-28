from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.services.payroll_service import list_payroll_payments

router = APIRouter(prefix="/payroll", tags=["payroll"])


@router.get("/payments")
def get_payments(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role not in {"hr", "admin"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return list_payroll_payments(db)
