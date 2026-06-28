from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db import Base, engine
import app.models
import app.models.announcement
import app.models.rate
import app.models.notification
from app.api.auth import router as auth_router
from app.api.v1.endpoints.leave_requests import router as leave_requests_router
from app.api.v1.endpoints.announcements import router as announcements_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.payroll import router as payroll_router
from app.api.v1.endpoints.daily_reports import router as daily_reports_router
from app.api.v1.endpoints.rates import router as rates_router
from app.api.v1.endpoints.notifications import router as notifications_router

Base.metadata.create_all(bind=engine)

# create_all only creates missing tables, not missing columns on existing ones.
with engine.begin() as connection:
    connection.execute(text("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_roles VARCHAR(255)"))
    connection.execute(text("ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS target_department VARCHAR(128)"))

app = FastAPI(title="TriOPS Backend")

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


@app.get("/api/health")
def health():
    return {"status": "ok"}
