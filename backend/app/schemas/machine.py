from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MachineBase(BaseModel):
    code: str
    name: str
    description: str | None = None
    area_id: UUID | None = None
    is_active: bool = True


class MachineCreate(MachineBase):
    pass


class MachineRead(MachineBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    current_status: str | None = None
    current_status_description: str | None = None
    created_at: datetime
    updated_at: datetime


class MachineDashboardRead(MachineRead):
    area_name: str | None = None
    current_status: str | None = None
    current_status_description: str | None = None
    current_order_status: str | None = None
    current_work_order: str | None = None
    current_ref_order: str | None = None
    last_activity_at: datetime | None = None


class MachineDashboardStatusUpdate(BaseModel):
    machine_status: str
    machine_status_description: str | None = None
