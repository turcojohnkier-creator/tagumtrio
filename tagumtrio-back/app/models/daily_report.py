from datetime import datetime

from sqlalchemy import DateTime, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db import Base


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    department: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    target_department: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    report_date: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    submitted_by: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    submitted_by_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="submitted", index=True)
    summary: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    entries: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # Who moved the report forward, so each role can see its own history.
    # verified_by = the receiving leadman who verified OR rejected it.
    verified_by: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    compiled_by: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    compiled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
