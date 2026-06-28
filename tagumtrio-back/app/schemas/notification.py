from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificationPublic(BaseModel):
    id: str
    type: str
    title: str
    message: str
    link: str | None = None
    created_at: datetime = Field(alias="createdAt")
    read_at: datetime | None = Field(default=None, alias="readAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
