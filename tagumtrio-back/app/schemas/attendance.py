from datetime import datetime
from pydantic import BaseModel, Field


class AttendanceCreate(BaseModel):
    employee_id: int = Field(..., alias="employeeId")
    employee_name: str = Field(..., alias="employeeName")
    department: str
    logged_hours: float = Field(0.0, alias="loggedHours")
    scanned_at: datetime = Field(..., alias="scannedAt")
    leadman_id: int | None = Field(default=None, alias="leadmanId")
    leadman_verified_at: datetime | None = Field(default=None, alias="leadmanVerifiedAt")
    head_id: int | None = Field(default=None, alias="headId")
    head_verified_at: datetime | None = Field(default=None, alias="headVerifiedAt")
    status: str | None = Field(default="pending")
    rate: float | None = None
    amount: float | None = None
    raw: dict | None = None
    notes: str | None = None


class AttendanceUpdate(BaseModel):
    leadman_id: int | None = Field(default=None, alias="leadmanId")
    leadman_verified_at: datetime | None = Field(default=None, alias="leadmanVerifiedAt")
    head_id: int | None = Field(default=None, alias="headId")
    head_verified_at: datetime | None = Field(default=None, alias="headVerifiedAt")
    status: str | None = None


class AttendancePublic(BaseModel):
    id: str
    employee_id: int = Field(..., alias="employeeId")
    employee_name: str = Field(..., alias="employeeName")
    department: str
    logged_hours: float = Field(0.0, alias="loggedHours")
    scanned_at: datetime = Field(..., alias="scannedAt")
    leadman_id: int | None = Field(default=None, alias="leadmanId")
    leadman_verified_at: datetime | None = Field(default=None, alias="leadmanVerifiedAt")
    head_id: int | None = Field(default=None, alias="headId")
    head_verified_at: datetime | None = Field(default=None, alias="headVerifiedAt")
    status: str
    rate: float | None = None
    amount: float | None = None
    raw: dict | None = None
    notes: str | None = None

    class Config:
        from_attributes = True
