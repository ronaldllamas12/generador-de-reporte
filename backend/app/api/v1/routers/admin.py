from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password, require_admin
from app.models.area import Area
from app.models.machine import Machine
from app.models.user import User
from app.repositories.area_repository import AreaRepository
from app.repositories.machine_repository import MachineRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import (
    AreaCreate,
    AreaRead,
    AreaUpdate,
    UserCreate,
    UserRead,
    UserUpdate,
    MachineRead,
    MachineCreate,
    MachineUpdate,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ============================================================================
# USERS MANAGEMENT
# ============================================================================


async def _load_user_areas(area_ids: list[UUID], session: AsyncSession) -> list[Area]:
    unique_area_ids = list(dict.fromkeys(area_ids))
    repository = AreaRepository(session)
    areas = await repository.get_by_ids(unique_area_ids)

    if len(areas) != len(unique_area_ids):
        raise HTTPException(status_code=400, detail="Una o más áreas no existen")

    return areas


async def _ensure_area_exists(area_id: UUID | None, session: AsyncSession) -> None:
    if area_id is None:
        raise HTTPException(status_code=400, detail="Selecciona un área")

    repository = AreaRepository(session)
    area = await repository.get_by_id(area_id)
    if area is None:
        raise HTTPException(status_code=400, detail="El área seleccionada no existe")


@router.get("/users", response_model=list[UserRead])
async def list_users(session: AsyncSession = Depends(get_db)):
    """List all users."""
    repository = UserRepository(session)
    users = await repository.list_all()
    return [UserRead.from_orm(user) for user in users]


@router.post("/users", response_model=UserRead, status_code=201)
async def create_user(payload: UserCreate, session: AsyncSession = Depends(get_db)):
    """Create a new user."""
    repository = UserRepository(session)
    
    # Check if email exists
    existing_user = await repository.get_by_email(payload.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email ya existe")
    
    # Create user
    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    new_user.areas = await _load_user_areas(payload.area_ids, session)
    
    user = await repository.create(new_user)
    return UserRead.from_orm(user)


@router.get("/users/{user_id}", response_model=UserRead)
async def get_user(user_id: UUID, session: AsyncSession = Depends(get_db)):
    """Get a user by ID."""
    repository = UserRepository(session)
    user = await repository.get_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return UserRead.from_orm(user)


@router.put("/users/{user_id}", response_model=UserRead)
async def update_user(user_id: UUID, payload: UserUpdate, session: AsyncSession = Depends(get_db)):
    """Update a user."""
    repository = UserRepository(session)
    user = await repository.get_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Check if new email exists (and is different from current)
    if payload.email and payload.email != user.email:
        existing = await repository.get_by_email(payload.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email ya existe")
        user.email = payload.email
    
    if payload.full_name:
        user.full_name = payload.full_name
    if payload.role:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.area_ids is not None:
        user.areas = await _load_user_areas(payload.area_ids, session)
    
    updated_user = await repository.update(user)
    return UserRead.from_orm(updated_user)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: UUID, session: AsyncSession = Depends(get_db)):
    """Delete a user."""
    repository = UserRepository(session)
    try:
        deleted = await repository.delete(user_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    if not deleted:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return None


# ============================================================================
# MACHINES MANAGEMENT
# ============================================================================


@router.get("/machines", response_model=list[MachineRead])
async def list_machines(session: AsyncSession = Depends(get_db)):
    """List all machines."""
    repository = MachineRepository(session)
    machines = await repository.list_active()
    return [MachineRead.from_orm(m) for m in machines]


@router.post("/machines", response_model=MachineRead, status_code=201)
async def create_machine(
    payload: MachineCreate,
    session: AsyncSession = Depends(get_db),
):
    """Create a new machine."""
    # Check if code already exists
    repository = MachineRepository(session)
    existing = await repository.get_by_code(payload.code)
    if existing:
        raise HTTPException(status_code=400, detail="Código de máquina ya existe")
    
    machine = Machine(
        code=payload.code,
        name=payload.name,
        description=payload.description,
        area_id=payload.area_id,
        is_active=payload.is_active,
    )
    await _ensure_area_exists(machine.area_id, session)
    
    created = await repository.create(machine)
    return MachineRead.from_orm(created)


@router.get("/machines/{machine_id}", response_model=MachineRead)
async def get_machine(machine_id: UUID, session: AsyncSession = Depends(get_db)):
    """Get a machine by ID."""
    repository = MachineRepository(session)
    machine = await repository.get_by_id(machine_id)
    
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    
    return MachineRead.from_orm(machine)


@router.put("/machines/{machine_id}", response_model=MachineRead)
async def update_machine(machine_id: UUID, payload: MachineUpdate, session: AsyncSession = Depends(get_db)):
    """Update a machine."""
    repository = MachineRepository(session)
    machine = await repository.get_by_id(machine_id)
    
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    
    if payload.code and payload.code != machine.code:
        existing = await repository.get_by_code(payload.code)
        if existing:
            raise HTTPException(status_code=400, detail="Código de máquina ya existe")
        machine.code = payload.code
    
    if payload.name:
        machine.name = payload.name
    if payload.description is not None:
        machine.description = payload.description
    if payload.area_id is not None:
        await _ensure_area_exists(payload.area_id, session)
        machine.area_id = payload.area_id
    if payload.is_active is not None:
        machine.is_active = payload.is_active
    
    updated = await repository.update(machine)
    return MachineRead.from_orm(updated)


@router.delete("/machines/{machine_id}", status_code=204)
async def delete_machine(machine_id: UUID, session: AsyncSession = Depends(get_db)):
    """Delete a machine."""
    repository = MachineRepository(session)
    deleted = await repository.delete(machine_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Máquina no encontrada")
    
    return None


# ============================================================================
# AREAS MANAGEMENT
# ============================================================================


@router.get("/areas", response_model=list[AreaRead])
async def list_areas(session: AsyncSession = Depends(get_db)):
    """List all areas."""
    repository = AreaRepository(session)
    areas = await repository.list_all()
    return [AreaRead.from_orm(area) for area in areas]


@router.post("/areas", response_model=AreaRead, status_code=201)
async def create_area(payload: AreaCreate, session: AsyncSession = Depends(get_db)):
    """Create a new area."""
    repository = AreaRepository(session)
    
    # Check if name exists
    existing = await repository.get_by_name(payload.name)
    if existing:
        raise HTTPException(status_code=400, detail="Nombre de área ya existe")
    
    area = Area(name=payload.name, description=payload.description)
    created = await repository.create(area)
    return AreaRead.from_orm(created)


@router.get("/areas/{area_id}", response_model=AreaRead)
async def get_area(area_id: UUID, session: AsyncSession = Depends(get_db)):
    """Get an area by ID."""
    repository = AreaRepository(session)
    area = await repository.get_by_id(area_id)
    
    if not area:
        raise HTTPException(status_code=404, detail="Área no encontrada")
    
    return AreaRead.from_orm(area)


@router.put("/areas/{area_id}", response_model=AreaRead)
async def update_area(area_id: UUID, payload: AreaUpdate, session: AsyncSession = Depends(get_db)):
    """Update an area."""
    repository = AreaRepository(session)
    area = await repository.get_by_id(area_id)
    
    if not area:
        raise HTTPException(status_code=404, detail="Área no encontrada")
    
    if payload.name and payload.name != area.name:
        existing = await repository.get_by_name(payload.name)
        if existing:
            raise HTTPException(status_code=400, detail="Nombre de área ya existe")
        area.name = payload.name
    
    if payload.description is not None:
        area.description = payload.description
    
    updated = await repository.update(area)
    return AreaRead.from_orm(updated)


@router.delete("/areas/{area_id}", status_code=204)
async def delete_area(area_id: UUID, session: AsyncSession = Depends(get_db)):
    """Delete an area."""
    repository = AreaRepository(session)
    deleted = await repository.delete(area_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Área no encontrada")
    
    return None
