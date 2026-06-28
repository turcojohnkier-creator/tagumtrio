from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.schemas.rate import RateCreate, RatePublic, RateUpdate
from app.services.rate_service import create_rate, delete_rate, list_rates, update_rate

router = APIRouter(prefix="/rates", tags=["rates"])


@router.get("", response_model=list[RatePublic])
def get_rates(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return list_rates(db)


@router.post("", response_model=RatePublic)
def post_rate(payload: RateCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role != "gm":
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    return create_rate(db, payload)


@router.patch("/{rate_id}", response_model=RatePublic)
def patch_rate(rate_id: str, payload: RateUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role != "gm":
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    try:
        return update_rate(db, rate_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{rate_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def remove_rate(rate_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role != "gm":
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    try:
        delete_rate(db, rate_id)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
