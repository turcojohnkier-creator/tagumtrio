from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String
from sqlalchemy.sql import func

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    identifier = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False, default="employee")
    department = Column(String, nullable=True)
    departments = Column(JSON, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Stamped when an account is archived (is_active set False), cleared on
    # reactivate — lets us purge accounts past the retention window (see
    # ARCHIVE_RETENTION_DAYS in app/api/v1/endpoints/users.py).
    archived_at = Column(DateTime(timezone=True), nullable=True)
