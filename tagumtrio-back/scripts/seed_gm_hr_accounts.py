"""One-off seed of the first GM and HR accounts (no self-registration exists).

Run with: python -m scripts.seed_gm_hr_accounts
Safe to re-run — skips any identifier that already exists.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.models.user import User
from app.security import get_password_hash

ACCOUNTS = [
    {"name": "General Manager", "identifier": "gen", "password": "123456", "role": "gm"},
    {"name": "Human Resource", "identifier": "hum", "password": "123456", "role": "hr"},
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
                department=None,
                departments=None,
                hashed_password=get_password_hash(account["password"]),
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created {account['role']} account: identifier={user.identifier} id={user.id}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
