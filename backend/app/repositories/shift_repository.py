from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.shift import Shift


class ShiftRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, shift: Shift) -> Shift:
        self.session.add(shift)
        await self.session.commit()
        await self.session.refresh(shift)
        return shift

    async def get_active_by_user(self, user_id) -> Shift | None:
        result = await self.session.execute(
            select(Shift)
            .where(Shift.user_id == user_id, Shift.status == "active")
            .order_by(Shift.start_time.desc())
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, shift_id) -> Shift | None:
        result = await self.session.execute(
            select(Shift)
            .where(Shift.id == shift_id)
            .options(selectinload(Shift.machine), selectinload(Shift.user))
        )
        return result.scalar_one_or_none()

    async def save(self, shift: Shift) -> Shift:
        await self.session.commit()
        await self.session.refresh(shift)
        return shift
