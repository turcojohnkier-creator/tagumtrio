"""One-off: assign a random department to every employee account that has none.

Run with: python -m scripts.assign_random_departments
"""
from __future__ import annotations

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.models.user import User

DEPARTMENTS = [
    "Rotary",
    "Sundry",
    "Sorting",
    "Assembly",
    "Assembly8.5&10",
    "Core Builder",
    "Repair",
    "Hotpress",
    "Putty",
    "Sander",
    "Spreader",
    "Sizer",
    "Packing",
    "Sand Paper",
    "Paint Black",
    "Bundle",
    "Logo",
]


def main() -> None:
    db = SessionLocal()
    try:
        employees = db.query(User).filter(User.role == "employee").all()
        employees = [e for e in employees if not e.department]
        for employee in employees:
            employee.department = random.choice(DEPARTMENTS)
            db.add(employee)
            print(f"Assigned {employee.name} (id={employee.id}) -> {employee.department}")
        db.commit()
        print(f"Updated {len(employees)} employees")
    finally:
        db.close()


if __name__ == "__main__":
    main()
