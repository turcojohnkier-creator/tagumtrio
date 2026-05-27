from datetime import datetime

from sqlalchemy import DateTime, Float, JSON, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db import Base


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    employee_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    employee_name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    logged_hours: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    scanned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    leadman_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    leadman_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    head_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    head_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)
    rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    raw: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
