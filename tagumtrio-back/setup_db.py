from pathlib import Path
from dotenv import load_dotenv
from urllib.parse import urlparse
import os
import psycopg

load_dotenv(Path(__file__).with_name('.env'))
url = os.getenv('DATABASE_URL')
if not url:
    raise SystemExit('DATABASE_URL is not set in .env')

parsed = urlparse(url)
dbname = parsed.path.lstrip('/')

try:
    psycopg.connect(url, autocommit=True).close()
    print('database exists')
except Exception:
    params = f'host={parsed.hostname} port={parsed.port or 5432} user={parsed.username} password={parsed.password}'
    with psycopg.connect(params, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(f'CREATE DATABASE "{dbname}"')
    print('database created')
