from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DepartmentRequestCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    employee_id: int = Field(alias="employeeId")
    employee_name: str = Field(alias="employeeName")
    requested_department: str = Field(alias="requestedDepartment")


class DepartmentRequestRedirect(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    target_department: str = Field(alias="targetDepartment")
    note: str | None = None


class DepartmentRequestPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    employee_id: int = Field(alias="employeeId")
    employee_name: str = Field(alias="employeeName")
    requested_department: str = Field(alias="requestedDepartment")
    status: str
    requested_at: datetime = Field(alias="requestedAt")
    leadman_id: int | None = Field(default=None, alias="leadmanId")
    leadman_at: datetime | None = Field(default=None, alias="leadmanAt")
    note: str | None = None
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")