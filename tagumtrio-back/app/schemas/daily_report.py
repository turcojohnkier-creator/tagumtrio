from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, Extra, field_serializer, field_validator
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


class DailyReportReturn(BaseModel):
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_required(cls, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise ValueError("A reason is required to return a report.")
        if len(value) > 1000:
            raise ValueError("Reason must be 1000 characters or less.")
        return value


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
    verified_by: int | None = Field(default=None, alias="verifiedBy")
    verified_at: datetime | None = Field(default=None, alias="verifiedAt")
    compiled_by: int | None = Field(default=None, alias="compiledBy")
    compiled_at: datetime | None = Field(default=None, alias="compiledAt")
    approved_by: int | None = Field(default=None, alias="approvedBy")
    approved_at: datetime | None = Field(default=None, alias="approvedAt")
    return_history: list[dict] = Field(default_factory=list, alias="returnHistory")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    # Inline base64 photos (reports not yet moved to report_photos) go out as
    # short URLs. Done here so every endpoint returning reports is covered,
    # including /history, where the employee branch overwrites public.entries.
    @field_serializer("entries")
    def _serialize_entries(self, entries: list[dict]) -> list[dict]:
        from app.services.report_photos import strip_photos
        return strip_photos(entries, self.id)
