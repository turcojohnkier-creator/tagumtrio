from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models.rate import PieceRate
from app.schemas.rate import RateCreate, RatePublic, RateUpdate


def _make_id(prefix: str = "RATE") -> str:
    token = uuid.uuid4().hex[:10].upper()
    return f"{prefix}-{token}"


def list_rates(db: Session) -> list[RatePublic]:
    rows = db.query(PieceRate).order_by(PieceRate.department, PieceRate.product).all()
    return [RatePublic.model_validate(row) for row in rows]


def create_rate(db: Session, payload: RateCreate) -> RatePublic:
    record = PieceRate(
        id=_make_id(),
        department=payload.department.strip(),
        product=payload.product.strip(),
        price_per_unit=payload.price_per_unit,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return RatePublic.model_validate(record)


def update_rate(db: Session, rate_id: str, payload: RateUpdate) -> RatePublic:
    record = db.get(PieceRate, rate_id)
    if record is None:
        raise ValueError("Rate not found.")

    if payload.department is not None:
        record.department = payload.department.strip()
    if payload.product is not None:
        record.product = payload.product.strip()
    if payload.price_per_unit is not None:
        record.price_per_unit = payload.price_per_unit

    db.commit()
    db.refresh(record)
    return RatePublic.model_validate(record)


def delete_rate(db: Session, rate_id: str) -> None:
    record = db.get(PieceRate, rate_id)
    if record is None:
        raise ValueError("Rate not found.")
    db.delete(record)
    db.commit()
