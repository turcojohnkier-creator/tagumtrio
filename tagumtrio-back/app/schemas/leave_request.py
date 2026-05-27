from datetime import datetime
from pydantic import BaseModel, Field


class LeaveRequestCreate(BaseModel):
    employee_id: int = Field(..., alias="employeeId")
    employee_name: str = Field(..., alias="employeeName")
    leave_type: str = Field(..., alias="leaveType")
    reason: str | None = None


class LeaveRequestApprove(BaseModel):
    note: str | None = None


class LeaveRequestPublic(BaseModel):
    id: str
    employee_id: int = Field(..., alias="employeeId")
    employee_name: str = Field(..., alias="employeeName")
    leave_type: str = Field(..., alias="leaveType")
    reason: str | None = None
    status: str
    requested_at: datetime = Field(..., alias="requestedAt")
    approved_by: int | None = Field(default=None, alias="approvedBy")
    approved_at: datetime | None = Field(default=None, alias="approvedAt")
    note: str | None = None

    class Config:
        from_attributes = True
