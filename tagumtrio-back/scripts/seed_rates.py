"""One-off seed of the piece-rate table from the operations rate sheet.

Run with: python -m scripts.seed_rates
Safe to re-run — skips any department/product pair that already exists.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import Base, SessionLocal, engine
from app.models.rate import PieceRate

RATES: dict[str, dict[str, float]] = {
    "Sundry": {
        "2.4": 105.00,
        "3.2": 87.00,
        "3.8": 73.00,
        "2.4 far tent": 135.00,
        "3.2 far tent": 117.00,
        "3.8 far tent": 103.00,
        "recovery 2.4": 125.00,
        "recovery 3.2": 107.00,
        "recovery 3.8": 93.00,
    },
    "Rotary": {
        "3.2": 75.00,
        "3.8": 60.00,
        "2.4": 90.00,
        "Tarima": 8.00,
    },
    "Packing": {
        "Classifying10mm/16mm/18mm": 100.00,
        "Putty Bagaso10mm/16mm/18mm": 60.00,
        "Strap": 18.00,
        "Logo": 20.00,
        "Liha": 45.00,
        "Strap Convan": 23.00,
        "Black Paint": 18.00,
    },
    "Putty": {
        "Putty": 2.30,
    },
    "Assembly": {
        "300 pcs": 11.00,
        "400 pcs": 12.00,
        "500 pcs": 13.00,
    },
    "Assembly8.5&10": {
        "600-799": 6.00,
        "800-up": 7.00,
    },
    "Veneering": {
        "Pair": 0.60,
    },
    "Sizer": {
        "Sizer16mm/18mm": 1.00,
        "Sizer8.5mm/10mm": 0.65,
        "Sizer5mm": 0.30,
    },
    "Repair": {
        "700-up": 2.30,
        "699-down": 1.00,
    },
    "Flour": {
        "Sack": 2.50,
    },
    "Bandsaw": {
        "Bundle": 875.00,
    },
    "Daily": {
        "Daily": 510.00,
    },
    "Sorting": {
        "sortA&B": 18.00,
        "Class C": 0.15,
    },
    "Spreader": {
        "Face and back": 60.00,
    },
    "Hotpress": {
        "Platform16-18mm": 2.64,
        "Platform8.5-10mm": 1.76,
        "Finish5mm": 1.60,
        "Finish3.8mm": 1.10,
        "Finish16-18mm": 1.18,
        "Finish8.5-10mm": 0.88,
        "Phenolic Double sided": 2.64,
        "Phenolic Single sided": 1.32,
    },
    "Sander": {
        "sander8-10mm": 1.00,
        "sander16-18mm": 1.50,
    },
    "Core Builder": {
        "#1": 0.35,
        "#2": 0.35,
    },
    "Maintenance": {
        "Tent": 2000.00,
    },
}


def _make_id() -> str:
    import uuid
    return f"RATE-{uuid.uuid4().hex[:10].upper()}"


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
                db.add(PieceRate(id=_make_id(), department=department, product=product, price_per_unit=price))
                created += 1
        db.commit()
        print(f"Seeded {created} rate(s); {len(existing)} already present.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
