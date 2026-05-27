# TriOPS Backend

This backend serves authentication for the TriOPS frontend and stores user accounts in PostgreSQL.

## Setup

1. Create a Python virtual environment:

   python -m venv .venv

2. Activate it:

   .venv\Scripts\Activate

3. Install dependencies:

   pip install -r requirements.txt

4. Copy `.env.example` to `.env` and update values if needed.

5. Ensure the PostgreSQL database exists. For example:

   psql -h localhost -U postgres -c "CREATE DATABASE tagumtrio;"

6. Run the server:

   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/health`

The frontend should use `VITE_API_URL=http://localhost:8000/api`.
