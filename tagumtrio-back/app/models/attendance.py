from datetime import datetime

from sqlalchemy import DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db import Base


class AttendanceMark(Base):
    """One row = one employee marked present for one work session of one day.

    Presence is the *existence* of a row for today's current session, so the
    "reset to inactive" at every time-out needs no scheduled job: once the
    session changes, nobody has a mark for the new one yet. Unmarking deletes
    the row.
    """

    __tablename__ = "attendance_marks"
    __table_args__ = (
        UniqueConstraint("employee_id", "work_date", "session", name="uq_attendance_employee_day_session"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    # Manila calendar day, "YYYY-MM-DD".
    work_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    # "morning" | "afternoon" | "overtime"
    session: Mapped[str] = mapped_column(String(16), nullable=False)
    marked_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    marked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
