from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AttendanceToggle(BaseModel):
    present: bool


class AttendanceSession(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    key: str
    label: str
    start: str  # "HH:MM", Manila time
    end: str


class AttendanceStatus(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    # "open" while a session is running; otherwise "before" (before 7:00 AM),
    # "lunch" (11:30 AM - 1:00 PM) or "ended" (after 6:00 PM). Toggles are
    # only accepted while "open".
    state: str
    session: AttendanceSession | None = None
    # The next session when locked, so the UI can say when attendance reopens.
    next_session: AttendanceSession | None = Field(default=None, alias="nextSession")
    work_date: str = Field(..., alias="workDate")
    server_time: datetime = Field(..., alias="serverTime")
    # When the state/session next changes; the UI refetches at this moment.
    next_change_at: datetime | None = Field(default=None, alias="nextChangeAt")
    present_employee_ids: list[int] = Field(default_factory=list, alias="presentEmployeeIds")
    # False while the GM has the time in / time out schedule switched off (demo mode).
    schedule_enabled: bool = Field(default=True, alias="scheduleEnabled")


class AttendanceScheduleUpdate(BaseModel):
    enabled: bool
