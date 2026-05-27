"""Migration script: convert user-related ID columns from text to integer.

Usage: run inside the project venv:
  "c:/TAGUM TRIO/.venv/Scripts/python.exe" scripts/migrate_ids.py

The script:
- inspects department_requests and attendance_records columns
- for any employee_id/leadman_id/head_id that are text, it will sanitize values by removing non-digits
- converts empty strings to NULL
- alters column type to integer using NULLIF(...,'')::integer

This is destructive if your existing textual IDs carry non-numeric meaning. Run only if you accept the conversion.
"""

from sqlalchemy import text
import sys
from pathlib import Path

# ensure project root is on sys.path so `app` package is importable
project_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(project_root))

from app.db import engine

TABLE_COLUMN_MAP = {
    'department_requests': ['employee_id', 'leadman_id'],
    'attendance_records': ['employee_id', 'leadman_id', 'head_id'],
}

INSPECT_COL_SQL = """
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = :table AND column_name = :column
"""

SANITIZE_SQL = """
UPDATE {table}
SET {col} = regexp_replace({col}::text, '\\D', '', 'g')
WHERE {col} IS NOT NULL AND {col}::text ~ '\\D'
"""

EMPTY_TO_NULL_SQL = """
UPDATE {table}
SET {col} = NULL
WHERE {col} = ''
"""

ALTER_TYPE_SQL = """
ALTER TABLE {table}
ALTER COLUMN {col} TYPE integer USING NULLIF({col}::text, '')::integer
"""

with engine.begin() as conn:
    for table, cols in TABLE_COLUMN_MAP.items():
        for col in cols:
            row = conn.execute(text(INSPECT_COL_SQL), {'table': table, 'column': col}).fetchone()
            if not row:
                print(f"Skipping {table}.{col}: column not found")
                continue
            data_type = row[1]
            print(f"{table}.{col} current type: {data_type}")
            if data_type in ('integer', 'bigint', 'smallint'):
                print(f"Already integer: {table}.{col}, skipping")
                continue

            # sanitize non-digits
            print(f"Sanitizing non-digit characters in {table}.{col}...")
            conn.execute(text(SANITIZE_SQL.format(table=table, col=col)))

            # convert empty strings to NULL
            print(f"Converting empty strings to NULL in {table}.{col}...")
            conn.execute(text(EMPTY_TO_NULL_SQL.format(table=table, col=col)))

            # alter column type
            print(f"Altering {table}.{col} type to integer...")
            conn.execute(text(ALTER_TYPE_SQL.format(table=table, col=col)))

    print("Migration complete.")
