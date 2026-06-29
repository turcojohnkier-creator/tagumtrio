"""One-off: lowercase every user's identifier (login username).

Login always lowercases the typed username before comparing, but account
creation never did — any identifier that picked up a capital letter at
creation time (e.g. mobile keyboard autocapitalize) became permanently
unloginable. This backfills existing rows to match the now-normalized
schema validators in app/schemas/user.py.

Aborts without changing anything if lowercasing would collide two
already-distinct accounts (e.g. both "Juan" and "juan" exist) — that
needs a human decision, not an automatic merge.

Run with: python -m scripts.normalize_identifiers
"""
from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.models.user import User


def main() -> None:
    db = SessionLocal()
    try:
        users = db.query(User).all()

        groups: dict[str, list[User]] = defaultdict(list)
        for user in users:
            groups[user.identifier.strip().lower()].append(user)

        collisions = {key: rows for key, rows in groups.items() if len(rows) > 1}
        if collisions:
            print("Aborting — found case-insensitive collisions, resolve manually first:")
            for key, rows in collisions.items():
                for row in rows:
                    print(f"  {key!r} <- id={row.id} identifier={row.identifier!r}")
            return

        changed = 0
        for user in users:
            normalized = user.identifier.strip().lower()
            if normalized != user.identifier:
                print(f"id={user.id}: {user.identifier!r} -> {normalized!r}")
                user.identifier = normalized
                changed += 1

        db.commit()
        print(f"Normalized {changed} identifier(s); {len(users) - changed} already lowercase.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
