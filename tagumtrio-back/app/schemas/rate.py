from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RateCreate(BaseModel):
    department: str
    product: str
    price_per_unit: float = Field(alias="pricePerUnit")

    model_config = ConfigDict(populate_by_name=True)


class RateUpdate(BaseModel):
    department: str | None = None
    product: str | None = None
    price_per_unit: float | None = Field(default=None, alias="pricePerUnit")

    model_config = ConfigDict(populate_by_name=True)


class RatePublic(BaseModel):
    id: str
    department: str
    product: str
    price_per_unit: float = Field(alias="pricePerUnit")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
