"""One-off seed of the piece-rate table from the operations rate sheet.

Run with: python -m scripts.seed_rates
Safe to re-run — skips any department/product pair that already exists.
The rate list lives in app/services/default_rates.py, which also loads it at
server startup when the rate table is empty.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import Base, SessionLocal, engine
from app.models.rate import PieceRate
from app.services.default_rates import RATES, make_rate_id


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = {(row.department, row.product) for row in db.query(PieceRate).all()}
        created = 0
        for department, products in RATES.items():
            for product, price in products.items():
                if (department, product) in existing:
                    continue
                db.add(PieceRate(id=make_rate_id(), department=department, product=product, price_per_unit=price))
                created += 1
        db.commit()
        print(f"Seeded {created} rate(s); {len(existing)} already present.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
