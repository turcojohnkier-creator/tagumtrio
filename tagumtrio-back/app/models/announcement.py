from datetime import datetime

from sqlalchemy import DateTime, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    audience: Mapped[str] = mapped_column(String(64), nullable=False, default="All employees", index=True)
    visibility: Mapped[str] = mapped_column(String(64), nullable=False, default="all_employees", index=True)
    target_roles: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)