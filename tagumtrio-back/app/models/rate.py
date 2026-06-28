from datetime import datetime

from sqlalchemy import DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db import Base


class PieceRate(Base):
    __tablename__ = "piece_rates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    department: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    product: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    price_per_unit: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
