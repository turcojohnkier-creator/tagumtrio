import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db import Base, SessionLocal, engine
import app.models
import app.models.report_photo
from app.services.bootstrap_service import ensure_default_accounts
from app.services.default_rates import ensure_default_rates
from app.services.report_photos import convert_inline_photos
import app.models.announcement
import app.models.rate
import app.models.notification
import app.models.attendance
import app.models.app_setting
from app.api.auth import router as auth_router
from app.api.v1.endpoints.leave_requests import router as leave_requests_router
from app.api.v1.endpoints.announcements import router as announcements_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.payroll import router as payroll_router
from app.api.v1.endpoints.daily_reports import router as daily_reports_router
from app.api.v1.endpoints.rates import router as rates_router
from app.api.v1.endpoints.notifications import router as notifications_router
from app.api.v1.endpoints.translate import router as translate_router
from app.api.v1.endpoints.avatars import router as avatars_router
from app.api.v1.endpoints.attendance import router as attendance_router
from app.api.v1.endpoints.backup import router as backup_router

Base.metadata.create_all(bind=engine)

# create_all only creates missing tables, not missing columns on existing ones.
with engine.begin() as connection:
    connection.execute(text("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_roles VARCHAR(255)"))
    connection.execute(text("ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS target_department VARCHAR(128)"))
    connection.execute(text("ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS start_date VARCHAR(32)"))
    connection.execute(text("ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS end_date VARCHAR(32)"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data BYTEA"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_mime VARCHAR"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ"))
    connection.execute(text("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_id INTEGER"))
    connection.execute(text("ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS verified_by INTEGER"))
    connection.execute(text("ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_daily_reports_verified_by ON daily_reports (verified_by)"))
    connection.execute(text("ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS compiled_by INTEGER"))
    connection.execute(text("ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS compiled_at TIMESTAMPTZ"))
    connection.execute(text("ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS approved_by INTEGER"))
    connection.execute(text("ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_daily_reports_compiled_by ON daily_reports (compiled_by)"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_daily_reports_approved_by ON daily_reports (approved_by)"))
    connection.execute(text("ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS return_history JSON"))

app = FastAPI(title="TriOPS Backend")
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.on_event("startup")
def create_default_accounts() -> None:
    # A GM and an HR account always exist, so a fresh or restored database can
    # be logged into (credentials from the DEFAULT_GM_* / DEFAULT_HR_* settings).
    ensure_default_accounts(SessionLocal)


@app.on_event("startup")
def load_default_rates() -> None:
    # Loads the built-in piece rates only when the rate table is empty.
    ensure_default_rates(SessionLocal)


@app.on_event("startup")
def start_photo_conversion() -> None:
    # Moves photos of older reports into report_photos. In a background thread
    # so the server starts listening right away; a no-op once all are moved.
    threading.Thread(target=convert_inline_photos, args=(SessionLocal,), daemon=True).start()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(leave_requests_router, prefix="/api/v1")
app.include_router(announcements_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(payroll_router, prefix="/api/v1")
app.include_router(daily_reports_router, prefix="/api/v1")
app.include_router(rates_router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")
app.include_router(translate_router, prefix="/api/v1")
app.include_router(avatars_router, prefix="/api/v1")
app.include_router(attendance_router, prefix="/api/v1")
app.include_router(backup_router, prefix="/api/v1")


@app.get("/api/health")
def health():
    return {"status": "ok"}
