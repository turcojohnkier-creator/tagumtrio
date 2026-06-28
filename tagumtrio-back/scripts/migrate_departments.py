"""One-off cleanup: drop rates for departments removed from the system
(Daily, Flour, Maintenance, Veneering, Bandsaw) and add rates for the new
departments introduced by the cross-department flow graph (Sand Paper,
Paint Black, Bundle, Logo).

Run with: python -m scripts.migrate_departments
Safe to re-run.
"""
from __future__ import annotations

import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import Base, SessionLocal, engine
from app.models.rate import PieceRate

REMOVED_DEPARTMENTS = ["Daily", "Flour", "Maintenance", "Veneering", "Bandsaw"]

NEW_RATES: dict[str, dict[str, float]] = {
    "Paint Black": {"Black Paint": 18.00},
    "Bundle": {"Bundle": 875.00},
    "Logo": {"Logo": 20.00},
    "Sand Paper": {},
}


def _make_id() -> str:
    return f"RATE-{uuid.uuid4().hex[:10].upper()}"


def migrate() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        removed = db.query(PieceRate).filter(PieceRate.department.in_(REMOVED_DEPARTMENTS)).delete(synchronize_session=False)

        existing = {(row.department, row.product) for row in db.query(PieceRate).all()}
        created = 0
        for department, products in NEW_RATES.items():
            for product, price in products.items():
                if (department, product) in existing:
                    continue
                db.add(PieceRate(id=_make_id(), department=department, product=product, price_per_unit=price))
                created += 1

        db.commit()
        print(f"Removed {removed} rate(s) for retired departments; added {created} new rate(s).")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
