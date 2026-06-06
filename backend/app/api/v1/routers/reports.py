from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.event_service import EventService
from app.services.report_service import ReportService
from app.services.shift_service import ShiftService
from app.repositories.machine_repository import MachineRepository

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/shifts/{shift_id}")
async def finalize_shift_and_generate_report(
    shift_id: UUID,
    session: AsyncSession = Depends(get_db),
):
    shift_service = ShiftService(session)
    event_service = EventService(session)
    report_service = ReportService(session)

    shift = await shift_service.repository.get_by_id(shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    machine_setups = await shift_service.machine_setup_repository.list_by_shift(shift_id)
    setup_by_machine = {str(item.machine_id): item for item in machine_setups}
    has_legacy_primary_setup = bool(getattr(shift, "machine_status", None))
    primary_machine_id = str(shift.machine_id)

    # Validate that all active machines have an inicio de turno (setup)
    machine_repo = MachineRepository(session)
    all_machines = await machine_repo.list_active()
    missing_start_machines_all: list[str] = []
    for m in all_machines:
        key = str(m.id)
        # If machine has no setup and isn't covered by legacy primary setup, it's missing
        if key not in setup_by_machine and not (has_legacy_primary_setup and key == primary_machine_id):
            missing_start_machines_all.append(f"{m.code} - {m.name}")

    if missing_start_machines_all:
        raise HTTPException(
            status_code=400,
            detail=(
                "No se puede generar el informe. No se inició turno en: "
                + ", ".join(missing_start_machines_all)
            ),
        )

    events = await event_service.list_by_shift(shift_id)

    missing_setup_machines: list[str] = []
    for event in events:
        if event.machine_id is None:
            continue
        key = str(event.machine_id)
        if key not in setup_by_machine and not (has_legacy_primary_setup and key == primary_machine_id):
            machine_label = "Máquina no identificada"
            if getattr(event, "machine", None) is not None:
                machine_label = f"{event.machine.code} - {event.machine.name}"
            if machine_label not in missing_setup_machines:
                missing_setup_machines.append(machine_label)

    if missing_setup_machines:
        raise HTTPException(
            status_code=400,
            detail=(
                "No se puede generar el informe. Falta inicio de turno en: "
                + ", ".join(missing_setup_machines)
            ),
        )

    def _to_list(value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            return [value] if value else []
        return []

    def _has_any_startup_photo(setup_like) -> bool:
        all_photos = (
            _to_list(getattr(setup_like, "img_materias_primas", None))
            + _to_list(getattr(setup_like, "img_condiciones_proceso", None))
            + _to_list(getattr(setup_like, "img_temp_secadores", None))
            + _to_list(getattr(setup_like, "img_extraccion_adhesivo", None))
            + _to_list(getattr(setup_like, "img_tiempo_paradas_turno_maquina", None))
            + _to_list(getattr(setup_like, "img_tiempo_paradas_turno", None))
        )
        return len(all_photos) > 0

    for setup in machine_setups:
        if setup.machine_status != "en_produccion":
            continue
        if not _has_any_startup_photo(setup):
            machine_label = (
                f"{setup.machine.code} - {setup.machine.name}"
                if getattr(setup, "machine", None) is not None
                else str(setup.machine_id)
            )
            raise HTTPException(
                status_code=400,
                detail=(
                    "No se puede generar el informe. Falta al menos una foto de inicio de turno en "
                    f"{machine_label}."
                ),
            )
        # Validar que máquinas en producción tengan al menos una orden iniciada
        if not (setup.work_order or setup.ref_order):
            machine_label = (
                f"{setup.machine.code} - {setup.machine.name}"
                if getattr(setup, "machine", None) is not None
                else str(setup.machine_id)
            )
            raise HTTPException(
                status_code=400,
                detail=(
                    f"La máquina {machine_label} se encuentra en estado PRODUCCIÓN pero no tiene orden iniciada. "
                    "Debe iniciar una orden en esta máquina antes de cerrar el turno."
                ),
            )

    if has_legacy_primary_setup and primary_machine_id not in setup_by_machine and shift.machine_status == "en_produccion":
        machine_label = (
            f"{shift.machine.code} - {shift.machine.name}"
            if getattr(shift, "machine", None) is not None
            else str(shift.machine_id)
        )
        if not _has_any_startup_photo(shift):
            raise HTTPException(
                status_code=400,
                detail=(
                    "No se puede generar el informe. Falta al menos una foto de inicio de turno en "
                    f"{machine_label}."
                ),
            )
        if not (shift.work_order or shift.ref_order):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"La máquina {machine_label} se encuentra en estado PRODUCCIÓN pero no tiene orden iniciada. "
                    "Debe iniciar una orden en esta máquina antes de cerrar el turno."
                ),
            )

    pdf_url = await report_service.generate_pdf(shift, events, machine_setups)
    await shift_service.close_shift(shift, pdf_url=pdf_url)

    return {"shift_id": str(shift.id), "pdf_url": pdf_url}
