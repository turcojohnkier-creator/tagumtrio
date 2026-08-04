"""One-off seed of GM, HR, and 10 demo employee accounts for trying out the system.

Run with: python -m scripts.seed_demo_accounts
Safe to re-run -- skips any identifier that already exists.
"""
from __future__ import annotations

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.models.user import User
from app.security import get_password_hash

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

EMPLOYEE_NAMES = [
    "John", "Mike", "Jean", "Anna", "Carlo",
    "Liza", "Mark", "Rina", "Paolo", "Grace",
]

ACCOUNTS = [
    {"name": "General Manager", "identifier": "gen", "password": "123456", "role": "gm", "department": None},
    {"name": "Human Resource", "identifier": "hum", "password": "123456", "role": "hr", "department": None},
] + [
    {
        "name": name,
        "identifier": name.lower(),
        "password": "123456",
        "role": "employee",
        "department": random.choice(DEPARTMENTS),
    }
    for name in EMPLOYEE_NAMES
]


def main() -> None:
    db = SessionLocal()
    try:
        for account in ACCOUNTS:
            existing = db.query(User).filter(User.identifier == account["identifier"]).first()
            if existing:
                print(f"Skipped {account['identifier']} — already exists (id={existing.id})")
                continue

            user = User(
                name=account["name"],
                identifier=account["identifier"],
                role=account["role"],
                department=account["department"],
                departments=None,
                hashed_password=get_password_hash(account["password"]),
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created {account['role']} account: identifier={user.identifier} id={user.id} department={user.department}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
