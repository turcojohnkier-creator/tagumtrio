from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


class UserBase(BaseModel):
    name: str
    identifier: str
    role: str
    department: Optional[str] = None
    departments: Optional[List[str]] = None


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 6:
            raise ValueError("Password must be at least 6 characters.")
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 bytes or less.")
        return value


class UserPublic(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    identifier: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserPublic
