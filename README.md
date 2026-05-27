# TagumTrio — Local development (no Docker)

Prerequisites (Windows):
- Python 3.10+ installed and available in PATH
- Node 18+ and npm
- PostgreSQL (psql/pg_restore available)

Quick steps (copy-paste in PowerShell):

1. Clone the repo
```
git clone <repo_url> C:\Projects\tagumtrio
cd C:\Projects\tagumtrio
```

2. Backend setup
```
cd tagumtrio-back
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Create DB user & DB (edit names/passwords as needed)
psql -U postgres -c "CREATE USER demo WITH PASSWORD 'demo_pass';"
psql -U postgres -c "CREATE DATABASE tagumtrio OWNER demo;"
# If you have a dump file created from the source machine, restore it:
# pg_restore -U demo -d tagumtrio C:\path\to\tagumtrio.dump
# Or use psql for plain SQL: psql -U demo -d tagumtrio -f C:\path\to\seed.sql

# Create a local .env (or copy .env.example)
copy ..\.env.example .env
# Edit .env as necessary (SECRET_KEY etc.)

# Run backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. Frontend setup
```
cd ..\tagumtrio-front
npm install
copy ..\.env.example .env.local
# ensure VITE_API_URL points to http://localhost:8000
npm run dev
```

Notes
- Do NOT commit real secrets to GitHub. For a school demo you may include a demo `.env` in a private repo, but prefer `.env.example` in public repos.
- If you prefer automation, run `tagumtrio-back\setup-local.ps1` (created in repo) to bootstrap the DB and venv.
