from datetime import datetime

from sqlalchemy import DateTime, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db import Base


class ReportPhoto(Base):
    """A daily-report photo, stored once and shared by every entry that shows it.

    Keyed by a content hash (see app.services.report_photos.photo_hash), so the
    same photo attached to several worker rows or reports is a single row.
    """

    __tablename__ = "report_photos"

    hash: Mapped[str] = mapped_column(String(32), primary_key=True)
    mime: Mapped[str] = mapped_column(String(64), nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
