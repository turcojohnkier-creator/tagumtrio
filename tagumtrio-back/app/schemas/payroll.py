from datetime import datetime
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class PayrollPaymentCreate(BaseModel):
    employeeId: int = Field(..., alias='employeeId')
    period: str
    amount: float


class PayrollPaymentPublic(BaseModel):
    # Reads the ORM's snake_case columns (or camelCase input) and outputs
    # camelCase, which is what the frontend expects.
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    employeeId: int = Field(..., validation_alias=AliasChoices('employee_id', 'employeeId'))
    period: str
    amount: float
    releasedAt: datetime | None = Field(default=None, validation_alias=AliasChoices('released_at', 'releasedAt'))
    releasedBy: int | None = Field(default=None, validation_alias=AliasChoices('released_by', 'releasedBy'))
