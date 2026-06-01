from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AnnouncementCreate(BaseModel):
    title: str
    body: str | None = None
    pinned: bool = False
    author: str | None = None
    audience: str | None = None
    visibility: str | None = None


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    pinned: bool | None = None
    author: str | None = None
    audience: str | None = None
    visibility: str | None = None


class AnnouncementPublic(BaseModel):
    id: str
    title: str
    body: str | None = None
    author: str | None = None
    pinned: bool
    audience: str = Field(default="All employees")
    visibility: str = Field(default="all_employees")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)