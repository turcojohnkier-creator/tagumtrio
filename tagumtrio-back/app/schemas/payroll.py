from datetime import datetime
from pydantic import BaseModel, Field


class PayrollPaymentCreate(BaseModel):
    employeeId: int = Field(..., alias='employeeId')
    period: str
    amount: float


class PayrollPaymentPublic(BaseModel):
    id: str
    employeeId: int = Field(..., alias='employeeId')
    period: str
    amount: float
    releasedAt: datetime | None = Field(default=None, alias='releasedAt')
    releasedBy: int | None = Field(default=None, alias='releasedBy')

    class Config:
        from_attributes = True
