from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List

from app.core.database import get_db
from app.schemas.shift import ShiftCreate, ShiftMachineSetupRead, ShiftRead
from app.services.shift_service import ShiftService

router = APIRouter(prefix="/shifts", tags=["shifts"])


@router.post("", response_model=ShiftRead, status_code=201)
async def start_shift(payload: ShiftCreate, session: AsyncSession = Depends(get_db)):
    service = ShiftService(session)
    return await service.start_shift(payload)


@router.post("/{shift_id}/close", response_model=ShiftRead)
async def close_shift(shift_id: UUID, session: AsyncSession = Depends(get_db)):
    service = ShiftService(session)
    shift = await service.repository.get_by_id(shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    return await service.close_shift(shift)


@router.post("/{shift_id}/setup", response_model=ShiftRead)
async def setup_shift(
    shift_id: UUID,
    setup_id: UUID | None = Form(None),
    machine_id: UUID | None = Form(None),
    machine_status: str = Form(...),
    machine_status_description: str | None = Form(None),
    work_order: str | None = Form(None),
    ref_order: str | None = Form(None),
    meters_to_produce: str | None = Form(None),
    product_to_laminate: str | None = Form(None),
    img_materias_primas: List[UploadFile] = File(default=[]),
    img_materias_primas_title: List[str] = Form(default=[]),
    img_condiciones_proceso: List[UploadFile] = File(default=[]),
    img_condiciones_proceso_title: List[str] = Form(default=[]),
    img_temp_secadores: List[UploadFile] = File(default=[]),
    img_temp_secadores_title: List[str] = Form(default=[]),
    img_extraccion_adhesivo: List[UploadFile] = File(default=[]),
    img_extraccion_adhesivo_title: List[str] = Form(default=[]),
    img_tiempo_paradas_turno_maquina: List[UploadFile] = File(default=[]),
    img_tiempo_paradas_turno_maquina_title: List[str] = Form(default=[]),
    retain_img_materias_primas: str | None = Form(None),
    retain_img_condiciones_proceso: str | None = Form(None),
    retain_img_temp_secadores: str | None = Form(None),
    retain_img_extraccion_adhesivo: str | None = Form(None),
    retain_img_tiempo_paradas_turno_maquina: str | None = Form(None),
    process_photos: List[UploadFile] = File(default=[]),
    process_photos_title: List[str] = Form(default=[]),
    session: AsyncSession = Depends(get_db),
):
    service = ShiftService(session)
    shift = await service.repository.get_by_id(shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    # Setup can start without photos; report finalization enforces mandatory
    # photos when machine_status is en_produccion.

    needs_description = machine_status in {"en_mantenimiento", "fuera_de_servicio"}
    if needs_description and not (machine_status_description or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Debe escribir una descripcion del estado para maquinas en mantenimiento o fuera de servicio",
        )

    return await service.setup_shift(
        shift=shift,
        setup_id=setup_id,
        machine_id=machine_id,
        machine_status=machine_status,
        machine_status_description=machine_status_description,
        work_order=work_order,
        ref_order=ref_order,
        meters_to_produce=meters_to_produce,
        product_to_laminate=product_to_laminate,
        img_materias_primas=img_materias_primas,
        img_materias_primas_title=img_materias_primas_title,
        img_condiciones_proceso=img_condiciones_proceso,
        img_condiciones_proceso_title=img_condiciones_proceso_title,
        img_temp_secadores=img_temp_secadores,
        img_temp_secadores_title=img_temp_secadores_title,
        img_extraccion_adhesivo=img_extraccion_adhesivo,
        img_extraccion_adhesivo_title=img_extraccion_adhesivo_title,
        img_tiempo_paradas_turno_maquina=img_tiempo_paradas_turno_maquina,
        img_tiempo_paradas_turno_maquina_title=img_tiempo_paradas_turno_maquina_title,
        retain_img_materias_primas=retain_img_materias_primas,
        retain_img_condiciones_proceso=retain_img_condiciones_proceso,
        retain_img_temp_secadores=retain_img_temp_secadores,
        retain_img_extraccion_adhesivo=retain_img_extraccion_adhesivo,
        retain_img_tiempo_paradas_turno_maquina=retain_img_tiempo_paradas_turno_maquina,
        process_photos=process_photos,
        process_photos_title=process_photos_title,
    )


@router.post("/{shift_id}/setups/{machine_id}/close", response_model=ShiftMachineSetupRead)
async def close_machine_setup(
    shift_id: UUID,
    machine_id: UUID,
    session: AsyncSession = Depends(get_db),
):
    service = ShiftService(session)
    shift = await service.repository.get_by_id(shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    try:
        setup = await service.close_machine_order(shift_id, machine_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    return {
        "id": setup.id,
        "machine_id": setup.machine_id,
        "machine_code": setup.machine.code if setup.machine else "N/A",
        "machine_name": setup.machine.name if setup.machine else "Máquina no identificada",
        "area": shift.area,
        "machine_status": setup.machine_status,
        "order_status": setup.order_status,
        "machine_status_description": setup.machine_status_description,
        "work_order": setup.work_order,
        "ref_order": setup.ref_order,
        "meters_to_produce": setup.meters_to_produce,
        "product_to_laminate": setup.product_to_laminate,
        "img_materias_primas": setup.img_materias_primas,
        "img_condiciones_proceso": setup.img_condiciones_proceso,
        "img_temp_secadores": setup.img_temp_secadores,
        "img_extraccion_adhesivo": setup.img_extraccion_adhesivo,
        "img_tiempo_paradas_turno_maquina": setup.img_tiempo_paradas_turno_maquina,
        "startup_photos_complete": True,
        "missing_startup_photos": [],
    }


@router.delete("/{shift_id}/setups/{setup_id}", status_code=204)
async def delete_machine_setup(
    shift_id: UUID,
    setup_id: UUID,
    session: AsyncSession = Depends(get_db),
):
    service = ShiftService(session)
    shift = await service.repository.get_by_id(shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail="Turno no encontrado")
    try:
        await service.delete_machine_order(shift_id, setup_id)
    except ValueError as error:
        detail = str(error)
        status_code = 404 if "no encontrado" in detail.lower() else 400
        raise HTTPException(status_code=status_code, detail=detail) from error

    return Response(status_code=204)


@router.get("/{shift_id}/setups", response_model=list[ShiftMachineSetupRead])
async def list_shift_machine_setups(shift_id: UUID, session: AsyncSession = Depends(get_db)):
    service = ShiftService(session)
    shift = await service.repository.get_by_id(shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    setups = await service.machine_setup_repository.list_by_shift(shift_id)

    def _to_list(value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            return [value] if value else []
        return []

    def _missing_for_setup(setup) -> list[str]:
        if setup.machine_status != "en_produccion":
            return []
        all_photos = (
            _to_list(setup.img_materias_primas)
            + _to_list(setup.img_condiciones_proceso)
            + _to_list(setup.img_temp_secadores)
            + _to_list(setup.img_extraccion_adhesivo)
            + _to_list(setup.img_tiempo_paradas_turno_maquina)
        )
        missing = []
        if len(all_photos) == 0:
            missing.append("Fotos de condiciones de proceso")
        return missing

    return [
        {
            "id": setup.id,
            "machine_id": setup.machine_id,
            "machine_code": setup.machine.code if setup.machine else "N/A",
            "machine_name": setup.machine.name if setup.machine else "Máquina no identificada",
            "area": shift.area,
            "machine_status": setup.machine_status,
            "order_status": setup.order_status,
            "machine_status_description": setup.machine_status_description,
            "work_order": setup.work_order,
            "ref_order": setup.ref_order,
            "meters_to_produce": setup.meters_to_produce,
            "product_to_laminate": setup.product_to_laminate,
            "img_materias_primas": setup.img_materias_primas,
            "img_condiciones_proceso": setup.img_condiciones_proceso,
            "img_temp_secadores": setup.img_temp_secadores,
            "img_extraccion_adhesivo": setup.img_extraccion_adhesivo,
            "img_tiempo_paradas_turno_maquina": setup.img_tiempo_paradas_turno_maquina,
            "startup_photos_complete": len(_missing_for_setup(setup)) == 0,
            "missing_startup_photos": _missing_for_setup(setup),
        }
        for setup in setups
    ]
