"""Seed 10 demo accounts covering every role, wired together for a full demo.

    GM, HR, Production In-Charge
    Leadman for Rotary   + 3 Rotary employees
    Leadman for Sundry   + 2 Sundry employees

Rotary's reports flow on to Sundry (see constants/department-flow.js), so the
Rotary leadman can create a report, the Sundry leadman can verify it as an
incoming report, the Production In-Charge compiles it and the GM approves it.
Each leadman also has employees to switch on/off in Deployed Workers, which
feeds the Active counts on the GM's Departments Overview.

Every account uses the password 123456.

Run from tagumtrio-back with: python -m scripts.seed_demo_roster
Safe to re-run: skips any identifier that already exists.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.models.user import User
from app.security import get_password_hash

PASSWORD = "123456"

ACCOUNTS = [
    {"name": "Demo General Manager", "identifier": "demogm", "role": "gm"},
    {"name": "Demo HR Officer", "identifier": "demohr", "role": "hr"},
    {"name": "Demo Production In-Charge", "identifier": "demopic", "role": "production_incharge"},
    {"name": "Ramon Dela Cruz", "identifier": "demolead1", "role": "leadman", "departments": ["Rotary"]},
    {"name": "Teresa Villanueva", "identifier": "demolead2", "role": "leadman", "departments": ["Sundry"]},
    {"name": "Juan Santos", "identifier": "demoemp1", "role": "employee", "department": "Rotary"},
    {"name": "Maria Reyes", "identifier": "demoemp2", "role": "employee", "department": "Rotary"},
    {"name": "Pedro Bautista", "identifier": "demoemp3", "role": "employee", "department": "Rotary"},
    {"name": "Ana Garcia", "identifier": "demoemp4", "role": "employee", "department": "Sundry"},
    {"name": "Jose Mendoza", "identifier": "demoemp5", "role": "employee", "department": "Sundry"},
]


def main() -> None:
    db = SessionLocal()
    try:
        for account in ACCOUNTS:
            existing = db.query(User).filter(User.identifier == account["identifier"]).first()
            if existing:
                print(f"Skipped {account['identifier']}: already exists (id={existing.id})")
                continue

            departments = account.get("departments")
            user = User(
                name=account["name"],
                identifier=account["identifier"],
                role=account["role"],
                # Leadmen are matched by `departments`; `department` mirrors the
                # first one for screens that only read the single field.
                department=account.get("department") or (departments[0] if departments else None),
                departments=departments,
                hashed_password=get_password_hash(PASSWORD),
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            where = ", ".join(departments) if departments else (user.department or "-")
            print(f"Created {user.role:<20} {user.identifier:<10} id={user.id:<5} department={where}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
