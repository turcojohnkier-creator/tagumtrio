"""Whole-database backup and restore, so data can move between the deployed
database and a local one (in either direction) and never be lost.

The backup is gzip-compressed JSON:
    {"format": "triops-backup", "version": 1, "createdAt": "...",
     "tables": {"users": {"columns": [...], "rows": [[...], ...]}, ...}}
Datetimes are ISO strings, binary columns (avatars, report photos) base64.
"""
from __future__ import annotations

import base64
import gzip
import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Integer, LargeBinary, text
from sqlalchemy.orm import Session

import app.models  # noqa: F401  (registers every table on Base.metadata)
from app.db import Base

BACKUP_FORMAT = "triops-backup"
BACKUP_VERSION = 1
INSERT_CHUNK = 500


class BackupError(ValueError):
    """The uploaded file can't be restored; the message is shown to the user."""


def _tables():
    return list(Base.metadata.sorted_tables)


def _encode(column, value: Any) -> Any:
    if value is None:
        return None
    if isinstance(column.type, LargeBinary):
        return base64.b64encode(bytes(value)).decode("ascii")
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _decode(column, value: Any) -> Any:
    if value is None:
        return None
    if isinstance(column.type, LargeBinary) and isinstance(value, str):
        return base64.b64decode(value)
    if isinstance(column.type, DateTime) and isinstance(value, str):
        return datetime.fromisoformat(value)
    return value


def export_database(db: Session) -> bytes:
    tables: dict[str, dict] = {}
    for table in _tables():
        columns = list(table.columns)
        rows = db.execute(table.select()).all()
        tables[table.name] = {
            "columns": [column.name for column in columns],
            "rows": [[_encode(column, row[i]) for i, column in enumerate(columns)] for row in rows],
        }
    payload = {
        "format": BACKUP_FORMAT,
        "version": BACKUP_VERSION,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "tables": tables,
    }
    return gzip.compress(json.dumps(payload, separators=(",", ":")).encode("utf-8"))


def _parse(raw: bytes) -> dict:
    if not raw:
        raise BackupError("The file is empty.")
    try:
        if raw[:2] == b"\x1f\x8b":
            raw = gzip.decompress(raw)
        payload = json.loads(raw.decode("utf-8"))
    except (OSError, EOFError, UnicodeDecodeError, ValueError) as exc:
        raise BackupError("This is not a TriOPS backup file.") from exc
    if not isinstance(payload, dict) or payload.get("format") != BACKUP_FORMAT:
        raise BackupError("This is not a TriOPS backup file.")
    if payload.get("version") != BACKUP_VERSION:
        raise BackupError(f"Unsupported backup version: {payload.get('version')}.")
    if not isinstance(payload.get("tables"), dict):
        raise BackupError("The backup file has no tables.")
    return payload


def _rows_for(table, data: dict) -> list[dict]:
    """Rows of one table as dicts, keeping only columns the current schema has."""
    names = data.get("columns") or []
    known = {column.name: column for column in table.columns}
    keep = [(i, known[name]) for i, name in enumerate(names) if name in known]
    try:
        return [{column.name: _decode(column, row[i]) for i, column in keep} for row in data.get("rows") or []]
    except (TypeError, ValueError, IndexError) as exc:
        raise BackupError(f"The backup's {table.name} table is damaged.") from exc


def _has_active_gm(user_rows: list[dict]) -> bool:
    return any(
        row.get("role") == "gm" and row.get("is_active") is not False and not row.get("archived_at")
        for row in user_rows
    )


def _reset_sequences(db: Session) -> None:
    """Explicit ids were inserted, so move Postgres id sequences past them."""
    if db.get_bind().dialect.name != "postgresql":
        return
    for table in _tables():
        pk = list(table.primary_key.columns)
        if len(pk) != 1 or not isinstance(pk[0].type, Integer):
            continue
        column = pk[0].name
        db.execute(text(
            f'SELECT setval(pg_get_serial_sequence(:table, :column), '
            f'COALESCE((SELECT MAX("{column}") FROM "{table.name}"), 0) + 1, false)'
        ), {"table": table.name, "column": column})


def import_database(db: Session, raw: bytes) -> dict[str, int]:
    """Replace every table's contents with the backup's. All or nothing."""
    payload = _parse(raw)
    backup_tables = payload["tables"]
    rows_by_table = {
        table.name: _rows_for(table, backup_tables[table.name])
        for table in _tables()
        if isinstance(backup_tables.get(table.name), dict)
    }
    if not _has_active_gm(rows_by_table.get("users", [])):
        raise BackupError("The backup has no active GM account, so nobody could log in to manage the system. Nothing was changed.")

    counts: dict[str, int] = {}
    try:
        for table in reversed(_tables()):
            db.execute(table.delete())
        for table in _tables():
            rows = rows_by_table.get(table.name, [])
            for start in range(0, len(rows), INSERT_CHUNK):
                db.execute(table.insert(), rows[start:start + INSERT_CHUNK])
            counts[table.name] = len(rows)
        _reset_sequences(db)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return counts
