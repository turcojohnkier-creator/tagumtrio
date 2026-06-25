from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AnnouncementCreate(BaseModel):
    title: str
    body: str | None = None
    pinned: bool = False
    author: str | None = None
    audience: str | None = None
    visibility: str | None = None
    target_roles: list[str] | None = Field(default=None, alias="targetRoles")

    model_config = ConfigDict(populate_by_name=True)


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    pinned: bool | None = None
    author: str | None = None
    audience: str | None = None
    visibility: str | None = None
    target_roles: list[str] | None = Field(default=None, alias="targetRoles")

    model_config = ConfigDict(populate_by_name=True)


class AnnouncementPublic(BaseModel):
    id: str
    title: str
    body: str | None = None
    author: str | None = None
    pinned: bool
    audience: str = Field(default="All employees")
    visibility: str = Field(default="all_employees")
    target_roles: list[str] | None = Field(default=None, alias="targetRoles")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)