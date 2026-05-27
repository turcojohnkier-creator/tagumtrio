"""Migration script: normalize user role values.

Converts common variants to canonical roles:
 - admin, Admin, human_resources, etc. -> hr
 - production_head, production_incharged, production incharge, etc. -> production_incharge

Run from project root (this script adjusts sys.path automatically).
"""
import sys
from textwrap import dedent

if __name__ == '__main__':
    # ensure project root is on sys.path
    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    from sqlalchemy import text
    from app.db import SessionLocal

    session = SessionLocal()
    try:
        print('\nExisting role distribution:')
        rows = session.execute(text('SELECT role, COUNT(*) AS cnt FROM users GROUP BY role ORDER BY cnt DESC')).all()
        for role, cnt in rows:
            print(f'  {role}: {cnt}')

        print('\nApplying role normalizations...')

        # Normalize admin/hr variants -> hr
        admin_variants = [
            'admin', 'hr', 'human_resources', 'human-resource', 'human resources'
        ]
        admin_list = ','.join(f"'{v}'" for v in admin_variants)
        session.execute(text(dedent(f"""
            UPDATE users
            SET role = 'hr'
            WHERE lower(role) IN ({admin_list});
        """)))

        # Normalize production variants -> production_incharge
        prod_variants = [
            'production_head', 'production_incharged', 'production incharge', 'production in-charged', 'production incharged'
        ]
        prod_list = ','.join(f"'{v}'" for v in prod_variants)
        session.execute(text(dedent(f"""
            UPDATE users
            SET role = 'production_incharge'
            WHERE lower(role) IN ({prod_list});
        """)))

        session.commit()

        print('\nRole distribution after migration:')
        rows = session.execute(text('SELECT role, COUNT(*) AS cnt FROM users GROUP BY role ORDER BY cnt DESC')).all()
        for role, cnt in rows:
            print(f'  {role}: {cnt}')

        print('\nMigration complete.')

    except Exception as exc:
        print('Migration failed:', exc)
        session.rollback()
        raise
    finally:
        session.close()
