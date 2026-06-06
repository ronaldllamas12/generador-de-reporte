from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class ShiftCreate(BaseModel):
    user_id: UUID
    machine_id: UUID
    area: str
    shift_number: int
    shift_date: date


class ShiftRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    machine_id: UUID
    area: str
    shift_number: int
    shift_date: date
    start_time: datetime
    end_time: datetime | None
    status: str
    pdf_url: str | None
    machine_status: str | None = None
    machine_status_description: str | None = None
    work_order: str | None = None
    ref_order: str | None = None
    meters_to_produce: str | None = None
    product_to_laminate: str | None = None
    img_materias_primas: list | None = None
    img_condiciones_proceso: list | None = None
    img_temp_secadores: list | None = None
    img_extraccion_adhesivo: list | None = None
    img_tiempo_paradas_turno: list | None = None

    @field_validator(
        'img_materias_primas', 'img_condiciones_proceso', 'img_temp_secadores',
        'img_extraccion_adhesivo', 'img_tiempo_paradas_turno',
        mode='before'
    )
    @classmethod
    def normalize_image_lists(cls, v):
        """Convert string JSON to list if needed (handles database migration)"""
        if v is None:
            return None
        if isinstance(v, str):
            # If it's a JSON string like '[]', convert it to empty list
            return [] if v == '[]' else [v]
        if isinstance(v, list):
            return v
        return None


class ShiftMachineSetupRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    machine_id: UUID
    machine_code: str
    machine_name: str
    area: str
    machine_status: str
    order_status: str | None = None
    machine_status_description: str | None = None
    work_order: str | None = None
    ref_order: str | None = None
    meters_to_produce: str | None = None
    product_to_laminate: str | None = None
    img_materias_primas: list | None = None
    img_condiciones_proceso: list | None = None
    img_temp_secadores: list | None = None
    img_extraccion_adhesivo: list | None = None
    img_tiempo_paradas_turno_maquina: list | None = None
    startup_photos_complete: bool
    missing_startup_photos: list[str]

    @field_validator(
        'img_materias_primas',
        'img_condiciones_proceso',
        'img_temp_secadores',
        'img_extraccion_adhesivo',
        'img_tiempo_paradas_turno_maquina',
        mode='before',
    )
    @classmethod
    def normalize_image_list(cls, v):
        """Convert string JSON to list if needed (handles database migration)"""
        if v is None:
            return None
        if isinstance(v, str):
            return [] if v == '[]' else [v]
        if isinstance(v, list):
            return v
        return None
