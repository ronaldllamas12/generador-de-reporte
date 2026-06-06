from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.shift import Shift
from app.models.shift_machine_setup import ShiftMachineSetup


class ShiftMachineSetupRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_shift_machine(self, shift_id, machine_id) -> ShiftMachineSetup | None:
        result = await self.session.execute(
            select(ShiftMachineSetup)
            .where(ShiftMachineSetup.shift_id == shift_id, ShiftMachineSetup.machine_id == machine_id)
            .order_by(ShiftMachineSetup.created_at.desc())
            .options(selectinload(ShiftMachineSetup.machine))
        )
        return result.scalars().first()

    async def get_by_id(self, setup_id) -> ShiftMachineSetup | None:
        result = await self.session.execute(
            select(ShiftMachineSetup)
            .where(ShiftMachineSetup.id == setup_id)
            .options(selectinload(ShiftMachineSetup.machine))
        )
        return result.scalars().first()

    async def get_open_by_shift_machine(self, shift_id, machine_id) -> ShiftMachineSetup | None:
        result = await self.session.execute(
            select(ShiftMachineSetup)
            .where(
                ShiftMachineSetup.shift_id == shift_id,
                ShiftMachineSetup.machine_id == machine_id,
                ShiftMachineSetup.order_status == "open",
            )
            .order_by(ShiftMachineSetup.created_at.desc())
            .options(selectinload(ShiftMachineSetup.machine))
        )
        return result.scalars().first()

    async def list_by_shift(self, shift_id) -> list[ShiftMachineSetup]:
        result = await self.session.execute(
            select(ShiftMachineSetup)
            .where(ShiftMachineSetup.shift_id == shift_id)
            .order_by(ShiftMachineSetup.machine_id.asc(), ShiftMachineSetup.created_at.asc())
            .options(selectinload(ShiftMachineSetup.machine))
        )
        return list(result.scalars().all())

    async def list_latest_per_machine(self) -> list[ShiftMachineSetup]:
        result = await self.session.execute(
            select(ShiftMachineSetup)
            .order_by(ShiftMachineSetup.machine_id.asc(), ShiftMachineSetup.created_at.desc())
            .options(selectinload(ShiftMachineSetup.machine))
        )

        latest_by_machine: dict[str, ShiftMachineSetup] = {}
        for setup in result.scalars().all():
            key = str(setup.machine_id)
            if key not in latest_by_machine:
                latest_by_machine[key] = setup

        return list(latest_by_machine.values())

    async def get_latest_active_by_machine(self, machine_id) -> ShiftMachineSetup | None:
        result = await self.session.execute(
            select(ShiftMachineSetup)
            .join(Shift)
            .where(
                ShiftMachineSetup.machine_id == machine_id,
                Shift.status == "active",
                Shift.shift_date == date.today(),
            )
            .order_by(ShiftMachineSetup.created_at.desc())
            .options(selectinload(ShiftMachineSetup.machine), selectinload(ShiftMachineSetup.shift))
        )
        return result.scalars().first()

    async def get_latest_by_machine(self, machine_id) -> ShiftMachineSetup | None:
        result = await self.session.execute(
            select(ShiftMachineSetup)
            .where(ShiftMachineSetup.machine_id == machine_id)
            .order_by(ShiftMachineSetup.created_at.desc())
            .options(selectinload(ShiftMachineSetup.machine), selectinload(ShiftMachineSetup.shift))
        )
        return result.scalars().first()

    async def create(self, setup: ShiftMachineSetup) -> ShiftMachineSetup:
        self.session.add(setup)
        await self.session.commit()
        await self.session.refresh(setup)
        return setup

    async def save(self, setup: ShiftMachineSetup) -> ShiftMachineSetup:
        await self.session.commit()
        await self.session.refresh(setup)
        return setup

    async def delete(self, setup: ShiftMachineSetup) -> None:
        await self.session.delete(setup)
        await self.session.commit()
