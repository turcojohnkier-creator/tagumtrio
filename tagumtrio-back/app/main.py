from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db import Base, engine
import app.models
import app.models.department_request
from app.api.auth import router as auth_router
from app.api.v1.endpoints.department_requests import router as department_requests_router
from app.api.v1.endpoints.attendance import router as attendance_router
from app.api.v1.endpoints.leave_requests import router as leave_requests_router
from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.payroll import router as payroll_router
from app.api.v1.endpoints.daily_reports import router as daily_reports_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="TriOPS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(department_requests_router, prefix="/api/v1")
app.include_router(attendance_router, prefix="/api/v1")
app.include_router(leave_requests_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(payroll_router, prefix="/api/v1")
app.include_router(daily_reports_router, prefix="/api/v1")


@app.get("/api/health")
def health():
    return {"status": "ok"}
