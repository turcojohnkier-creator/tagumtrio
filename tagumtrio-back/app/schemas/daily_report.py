from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, Extra
from typing import Any


class DailyReportEntry(BaseModel):
    id: str
    employeeId: int | None = None
    employeeName: str
    department: str
    loggedHours: float
    amount: float
    notes: str | None = None

    class Config:
        extra = Extra.allow


class DailyReportCreate(BaseModel):
    department: str
    targetDepartment: str | None = Field(default=None, alias="targetDepartment")
    reportDate: str
    submittedBy: int | None = Field(default=None, alias="submittedBy")
    submittedByName: str | None = Field(default=None, alias="submittedByName")
    status: str | None = Field(default='submitted')
    summary: str | None = None
    entries: list[DailyReportEntry] | list[dict] | Any

    class Config:
        extra = Extra.allow


class DailyReportResubmit(BaseModel):
    department: str
    targetDepartment: str | None = Field(default=None, alias="targetDepartment")
    summary: str | None = None
    entries: list[DailyReportEntry] | list[dict] | Any

    class Config:
        extra = Extra.allow


class DailyReportUpdate(BaseModel):
    status: str
    verifiedBy: int | None = Field(default=None, alias="verifiedBy")
    verifiedByName: str | None = Field(default=None, alias="verifiedByName")
    notes: str | None = None

    class Config:
        extra = Extra.allow


class DailyReportPublic(BaseModel):
    id: str
    department: str
    target_department: str | None = Field(default=None, alias="targetDepartment")
    report_date: str = Field(alias="reportDate")
    submitted_by: int | None = Field(default=None, alias="submittedBy")
    submitted_by_name: str | None = Field(default=None, alias="submittedByName")
    status: str
    summary: str | None = None
    entries: list[dict]
    created_at: datetime = Field(alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
