from typing import List
import json

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shift import Shift
from app.models.shift_machine_setup import ShiftMachineSetup
from app.repositories.event_repository import EventRepository
from app.repositories.machine_repository import MachineRepository
from app.repositories.shift_machine_setup_repository import ShiftMachineSetupRepository
from app.repositories.shift_repository import ShiftRepository
from app.schemas.shift import ShiftCreate
from app.services.cloudinary_service import CloudinaryService


class ShiftService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = ShiftRepository(session)
        self.machine_repository = MachineRepository(session)
        self.machine_setup_repository = ShiftMachineSetupRepository(session)
        self.event_repository = EventRepository(session)

    async def start_shift(self, payload: ShiftCreate) -> Shift:
        shift = Shift(
            user_id=payload.user_id,
            machine_id=payload.machine_id,
            area=payload.area,
            shift_number=payload.shift_number,
            shift_date=payload.shift_date,
        )
        return await self.repository.create(shift)

    async def get_active_shift(self, user_id):
        return await self.repository.get_active_by_user(user_id)

    async def close_shift(self, shift: Shift, pdf_url: str | None = None) -> Shift:
        shift.status = "finalized"
        shift.pdf_url = pdf_url
        from datetime import datetime

        shift.end_time = datetime.utcnow()
        return await self.repository.save(shift)

    async def setup_shift(
        self,
        shift: Shift,
        setup_id,
        machine_id,
        machine_status: str,
        machine_status_description: str | None,
        work_order: str | None,
        ref_order: str | None,
        meters_to_produce: str | None,
        product_to_laminate: str | None,
        img_materias_primas: List[UploadFile] = None,
        img_materias_primas_title: List[str] = None,
        img_condiciones_proceso: List[UploadFile] = None,
        img_condiciones_proceso_title: List[str] = None,
        img_temp_secadores: List[UploadFile] = None,
        img_temp_secadores_title: List[str] = None,
        img_extraccion_adhesivo: List[UploadFile] = None,
        img_extraccion_adhesivo_title: List[str] = None,
        img_tiempo_paradas_turno_maquina: List[UploadFile] = None,
        img_tiempo_paradas_turno_maquina_title: List[str] = None,
        retain_img_materias_primas: str | None = None,
        retain_img_condiciones_proceso: str | None = None,
        retain_img_temp_secadores: str | None = None,
        retain_img_extraccion_adhesivo: str | None = None,
        retain_img_tiempo_paradas_turno_maquina: str | None = None,
        process_photos: List[UploadFile] = None,
        process_photos_title: List[str] = None,
    ) -> Shift:
        if img_materias_primas is None:
            img_materias_primas = []
        if img_condiciones_proceso is None:
            img_condiciones_proceso = []
        if img_temp_secadores is None:
            img_temp_secadores = []
        if img_extraccion_adhesivo is None:
            img_extraccion_adhesivo = []
        if img_tiempo_paradas_turno_maquina is None:
            img_tiempo_paradas_turno_maquina = []
        if process_photos is None:
            process_photos = []
        if img_materias_primas_title is None:
            img_materias_primas_title = []
        if img_condiciones_proceso_title is None:
            img_condiciones_proceso_title = []
        if img_temp_secadores_title is None:
            img_temp_secadores_title = []
        if img_extraccion_adhesivo_title is None:
            img_extraccion_adhesivo_title = []
        if img_tiempo_paradas_turno_maquina_title is None:
            img_tiempo_paradas_turno_maquina_title = []
        if process_photos_title is None:
            process_photos_title = []

        cloudinary_service = CloudinaryService()

        target_machine_id = machine_id or shift.machine_id

        def _normalize_to_list(field):
            if field is None:
                return []
            elif isinstance(field, str):
                return [field] if field else []
            elif isinstance(field, list):
                return field
            return []

        def _parse_retained(raw_value: str | None, current_value):
            if raw_value is None:
                return _normalize_to_list(current_value)
            try:
                parsed = json.loads(raw_value)
            except Exception:
                return _normalize_to_list(current_value)
            if not isinstance(parsed, list):
                return _normalize_to_list(current_value)
            return parsed

        async def _upload_many(uploads: List[UploadFile], titles: List[str], category: str) -> list:
            entries = []
            for index, upload in enumerate(uploads):
                if upload is None:
                    continue
                url = await cloudinary_service.upload_image(upload, category)
                if url:
                    title = (titles[index] if index < len(titles) else "").strip()
                    entries.append({"url": url, "title": title} if title else url)
            return entries

        existing_setup = None
        if setup_id is not None:
            existing_setup = await self.machine_setup_repository.get_by_id(setup_id)
            if existing_setup is None:
                raise ValueError("No se encontró el registro de orden a editar")
            if existing_setup.shift_id != shift.id:
                raise ValueError("El registro de orden no pertenece al turno")
            if machine_id is not None and existing_setup.machine_id != machine_id:
                raise ValueError("El registro de orden no pertenece a la máquina seleccionada")
            target_machine_id = existing_setup.machine_id
        else:
            existing_setup = await self.machine_setup_repository.get_open_by_shift_machine(shift.id, target_machine_id)

        if existing_setup is None:
            existing_setup = ShiftMachineSetup(
                shift_id=shift.id,
                machine_id=target_machine_id,
                order_status="open",
                machine_status=machine_status,
            )
            await self.machine_setup_repository.create(existing_setup)

        existing_setup.machine_status = machine_status
        existing_setup.order_status = existing_setup.order_status if setup_id is not None else "open"
        existing_setup.machine_status_description = (
            (machine_status_description or "").strip() if machine_status in {"en_mantenimiento", "fuera_de_servicio"} else None
        )
        existing_setup.work_order = work_order
        existing_setup.ref_order = ref_order
        existing_setup.meters_to_produce = meters_to_produce
        existing_setup.product_to_laminate = product_to_laminate

        existing_setup.img_materias_primas = _parse_retained(
            retain_img_materias_primas,
            existing_setup.img_materias_primas,
        )
        existing_setup.img_condiciones_proceso = _parse_retained(
            retain_img_condiciones_proceso,
            existing_setup.img_condiciones_proceso,
        )
        existing_setup.img_temp_secadores = _parse_retained(
            retain_img_temp_secadores,
            existing_setup.img_temp_secadores,
        )
        existing_setup.img_extraccion_adhesivo = _parse_retained(
            retain_img_extraccion_adhesivo,
            existing_setup.img_extraccion_adhesivo,
        )
        existing_setup.img_tiempo_paradas_turno_maquina = _parse_retained(
            retain_img_tiempo_paradas_turno_maquina,
            existing_setup.img_tiempo_paradas_turno_maquina,
        )

        # Upload new images to Cloudinary and append the resulting entries.
        saved_materias = await _upload_many(img_materias_primas, img_materias_primas_title, "setup/materias_primas")
        saved_condiciones = await _upload_many(img_condiciones_proceso, img_condiciones_proceso_title, "setup/condiciones_proceso")
        saved_secadores = await _upload_many(img_temp_secadores, img_temp_secadores_title, "setup/temp_secadores")
        saved_extraccion = await _upload_many(img_extraccion_adhesivo, img_extraccion_adhesivo_title, "setup/extraccion_adhesivo")
        saved_tiempo_paradas = await _upload_many(
            img_tiempo_paradas_turno_maquina,
            img_tiempo_paradas_turno_maquina_title,
            "setup/tiempo_paradas_turno_maquina",
        )
        saved_process_photos = await _upload_many(process_photos, process_photos_title, "setup/condiciones_proceso")

        if saved_materias:
            existing_setup.img_materias_primas = _normalize_to_list(existing_setup.img_materias_primas) + saved_materias

        if saved_condiciones:
            existing_setup.img_condiciones_proceso = _normalize_to_list(existing_setup.img_condiciones_proceso) + saved_condiciones

        if saved_process_photos:
            existing_setup.img_condiciones_proceso = _normalize_to_list(existing_setup.img_condiciones_proceso) + saved_process_photos

        if saved_secadores:
            existing_setup.img_temp_secadores = _normalize_to_list(existing_setup.img_temp_secadores) + saved_secadores

        if saved_extraccion:
            existing_setup.img_extraccion_adhesivo = _normalize_to_list(existing_setup.img_extraccion_adhesivo) + saved_extraccion

        if saved_tiempo_paradas:
            existing_setup.img_tiempo_paradas_turno_maquina = _normalize_to_list(existing_setup.img_tiempo_paradas_turno_maquina) + saved_tiempo_paradas

        await self.machine_setup_repository.save(existing_setup)

        machine = await self.machine_repository.get_by_id(target_machine_id)
        if machine is not None:
            machine.current_status = existing_setup.machine_status
            machine.current_status_description = existing_setup.machine_status_description
            await self.machine_repository.save(machine)

        # ⚠️ TEMPORARY WORKAROUND: Skip syncing to legacy shift-level image fields
        # Reason: Database columns still VARCHAR(255), can't hold JSON arrays exceeding 255 chars
        # Solution: Keep legacy field sync disabled until database migration completes
        # After DB migration, uncomment the code below and re-enable shift.save()
        """
        if target_machine_id == shift.machine_id:
            shift.machine_status = existing_setup.machine_status
            shift.machine_status_description = existing_setup.machine_status_description
            shift.work_order = existing_setup.work_order
            shift.ref_order = existing_setup.ref_order
            shift.meters_to_produce = existing_setup.meters_to_produce
            shift.product_to_laminate = existing_setup.product_to_laminate
            shift.img_materias_primas = existing_setup.img_materias_primas
            shift.img_condiciones_proceso = existing_setup.img_condiciones_proceso
            shift.img_temp_secadores = existing_setup.img_temp_secadores
            shift.img_extraccion_adhesivo = existing_setup.img_extraccion_adhesivo
        """

        return await self.repository.save(shift)

    async def close_machine_order(self, shift_id, machine_id) -> ShiftMachineSetup:
        setup = await self.machine_setup_repository.get_open_by_shift_machine(shift_id, machine_id)
        if setup is None:
            raise ValueError("No existe una orden activa para cerrar")
        setup.order_status = "closed"
        from datetime import datetime

        setup.closed_at = datetime.utcnow()
        return await self.machine_setup_repository.save(setup)

    async def delete_machine_order(self, shift_id, setup_id) -> None:
        setup = await self.machine_setup_repository.get_by_id(setup_id)
        if setup is None or setup.shift_id != shift_id:
            raise ValueError("Registro de orden no encontrado")

        linked_events_count = await self.event_repository.count_by_setup_id(setup.id)
        if linked_events_count > 0:
            raise ValueError("No se puede eliminar la orden porque tiene novedades asociadas")

        await self.machine_setup_repository.delete(setup)
