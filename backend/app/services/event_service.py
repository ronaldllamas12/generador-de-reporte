from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.event import Event
from app.repositories.event_repository import EventRepository
from app.repositories.machine_repository import MachineRepository
from app.repositories.shift_machine_setup_repository import ShiftMachineSetupRepository
from app.repositories.shift_repository import ShiftRepository
from app.services.cloudinary_service import CloudinaryService


class EventService:
    def __init__(self, session: AsyncSession) -> None:
        self.settings = get_settings()
        self.event_repository = EventRepository(session)
        self.shift_repository = ShiftRepository(session)
        self.machine_repository = MachineRepository(session)
        self.shift_setup_repository = ShiftMachineSetupRepository(session)
        self.cloudinary_service = CloudinaryService()

    async def create_event(
        self,
        shift_id,
        machine_id,
        description: str,
        event_time,
        event_end_time=None,
        image: UploadFile | None = None,
    ) -> Event:
        shift = await self.shift_repository.get_by_id(shift_id)
        if shift is None:
            raise ValueError("El turno no existe")
        if shift.status != "active":
            raise ValueError("El turno no esta activo")

        event_machine_id = machine_id or shift.machine_id
        if event_machine_id is None:
            raise ValueError("No se pudo determinar la maquina del evento")

        machine = await self.machine_repository.get_by_id(event_machine_id)
        if machine is None:
            raise ValueError("La maquina seleccionada no existe")

        latest_setup = await self.shift_setup_repository.get_by_shift_machine(shift_id, event_machine_id)
        if latest_setup is None:
            raise ValueError("No hay una orden registrada para esta máquina")

        if event_end_time is not None and event_end_time < event_time:
            raise ValueError("La hora de finalizacion no puede ser anterior a la hora de inicio")

        image_path = None
        if image is not None:
            image_path = await self.cloudinary_service.upload_image(image, "events")

        event = Event(
            shift_id=shift_id,
            machine_id=event_machine_id,
            shift_setup_id=latest_setup.id,
            event_time=event_time,
            event_end_time=event_end_time,
            description=description,
            image_path=image_path,
        )
        return await self.event_repository.create(event)

    async def list_by_shift(self, shift_id):
        return await self.event_repository.list_by_shift(shift_id)
