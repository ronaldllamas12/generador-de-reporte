from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.machine import MachineCreate, MachineDashboardRead, MachineDashboardStatusUpdate, MachineRead
from app.services.machine_service import MachineService

router = APIRouter(prefix="/machines", tags=["machines"])


@router.get("", response_model=list[MachineRead])
async def list_machines(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    service = MachineService(session)
    return await service.list_active(current_user)


@router.get("/dashboard", response_model=list[MachineDashboardRead])
async def list_machine_dashboard(
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    service = MachineService(session)
    return await service.list_dashboard(current_user)


@router.patch("/{machine_id}/status", response_model=MachineDashboardRead)
async def update_machine_status(
    machine_id: UUID,
    payload: MachineDashboardStatusUpdate,
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    service = MachineService(session)
    try:
        return await service.update_dashboard_status(machine_id, payload, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("", response_model=MachineRead, status_code=201)
async def create_machine(payload: MachineCreate, session: AsyncSession = Depends(get_db)):
    service = MachineService(session)
    try:
        return await service.create(payload)
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Ya existe una máquina con ese código") from exc
