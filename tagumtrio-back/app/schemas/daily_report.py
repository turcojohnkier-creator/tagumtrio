from datetime import datetime
from pydantic import BaseModel, Field
from typing import Any


class DailyReportEntry(BaseModel):
    id: str
    employeeId: int | None = None
    employeeName: str
    department: str
    loggedHours: float
    amount: float
    notes: str | None = None


class DailyReportCreate(BaseModel):
    department: str
    reportDate: str
    submittedBy: int | None = Field(default=None, alias="submittedBy")
    submittedByName: str | None = Field(default=None, alias="submittedByName")
    status: str | None = Field(default='submitted')
    summary: str | None = None
    entries: list[DailyReportEntry] | list[dict] | Any


class DailyReportPublic(BaseModel):
    id: str
    department: str
    reportDate: str = Field(alias="report_date")
    submittedBy: int | None = Field(default=None, alias="submitted_by")
    submittedByName: str | None = Field(default=None, alias="submitted_by_name")
    status: str
    summary: str | None = None
    entries: list[dict]
    createdAt: datetime = Field(alias="created_at")

    class Config:
        from_attributes = True
