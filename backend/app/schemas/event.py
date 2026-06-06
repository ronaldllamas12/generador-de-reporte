from datetime import time, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    shift_id: UUID
    machine_id: UUID | None
    shift_setup_id: UUID | None = None
    event_time: time
    event_end_time: time | None = None
    description: str
    image_path: str | None
    created_at: datetime
    updated_at: datetime
