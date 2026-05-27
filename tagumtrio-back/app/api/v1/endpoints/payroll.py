from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.services.payroll_service import list_payroll_cycles, get_payroll_cycle_details, list_payroll_payments, release_payroll_for_cycle

router = APIRouter(prefix="/payroll", tags=["payroll"])


@router.get("/cycles")
def get_cycles(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # finance/hr/admin can view cycles
    if current_user.role not in {"finance", "hr", "production_incharge", "admin"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return list_payroll_cycles(db)


@router.get("/cycles/{cycle_key}")
def get_cycle_details(cycle_key: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role not in {"finance", "hr", "production_incharge", "admin"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return get_payroll_cycle_details(db, cycle_key)


@router.get("/payments")
def get_payments(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role not in {"finance", "hr", "admin"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return list_payroll_payments(db)


@router.post("/release")
def post_release(payload: dict, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # payload expected: { cycleKey: str }
    if current_user.role not in {"finance", "hr", "admin"}:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    cycle_key = payload.get('cycleKey') or payload.get('cycle')
    if not cycle_key:
        raise HTTPException(status_code=400, detail='Missing cycle key')
    payments = release_payroll_for_cycle(db, cycle_key, released_by=current_user.id)
    return payments
