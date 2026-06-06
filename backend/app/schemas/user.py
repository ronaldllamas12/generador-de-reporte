from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    role: str = Field(default="employee", min_length=1, max_length=50)
    is_active: bool = Field(default=True)
    area_ids: list[UUID] = Field(default_factory=list)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=150)
    email: EmailStr | None = None
    role: str | None = Field(None, min_length=1, max_length=50)
    is_active: bool | None = None
    area_ids: list[UUID] | None = None


class UserChangePassword(BaseModel):
    old_password: str = Field(...)
    new_password: str = Field(..., min_length=8)


class UserRead(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: str
    is_active: bool
    areas: list[AreaRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class MachineBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=150)
    description: str | None = Field(None, max_length=255)
    is_active: bool = Field(default=True)
    area_id: UUID | None = None


class MachineCreate(MachineBase):
    pass


class MachineUpdate(BaseModel):
    code: str | None = Field(None, min_length=1, max_length=50)
    name: str | None = Field(None, min_length=1, max_length=150)
    description: str | None = Field(None, max_length=255)
    is_active: bool | None = None
    area_id: UUID | None = None


class MachineRead(BaseModel):
    id: UUID
    code: str
    name: str
    description: str | None
    area_id: UUID | None = None
    area: Optional["AreaRead"] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AreaBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    description: str | None = Field(None, max_length=255)


class AreaCreate(AreaBase):
    pass


class AreaUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    description: str | None = Field(None, max_length=255)


class AreaRead(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
