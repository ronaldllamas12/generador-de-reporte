from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.machine import Machine


class MachineRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_active(self, area_ids: list[UUID] | None = None) -> list[Machine]:
        query = (
            select(Machine)
            .options(selectinload(Machine.area))
            .where(Machine.is_active.is_(True))
            .order_by(Machine.name)
        )
        if area_ids is not None:
            if not area_ids:
                return []
            query = query.where(Machine.area_id.in_(area_ids))

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create(self, machine: Machine) -> Machine:
        self.session.add(machine)
        await self.session.commit()
        await self.session.refresh(machine, attribute_names=["area"])
        return machine

    async def get_by_id(self, machine_id) -> Machine | None:
        result = await self.session.execute(
            select(Machine).options(selectinload(Machine.area)).where(Machine.id == machine_id)
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str) -> Machine | None:
        result = await self.session.execute(select(Machine).where(Machine.code == code))
        return result.scalar_one_or_none()

    async def update(self, machine: Machine) -> Machine:
        await self.session.merge(machine)
        await self.session.commit()
        await self.session.refresh(machine, attribute_names=["area"])
        return machine

    async def save(self, machine: Machine) -> Machine:
        await self.session.commit()
        await self.session.refresh(machine, attribute_names=["area"])
        return machine

    async def delete(self, machine_id: UUID) -> bool:
        machine = await self.get_by_id(machine_id)
        if machine:
            await self.session.delete(machine)
            await self.session.commit()
            return True
        return False
