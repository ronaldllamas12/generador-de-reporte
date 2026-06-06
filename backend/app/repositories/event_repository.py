from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.event import Event


class EventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, event: Event) -> Event:
        self.session.add(event)
        await self.session.commit()
        await self.session.refresh(event)
        return event

    async def list_by_shift(self, shift_id) -> list[Event]:
        result = await self.session.execute(
            select(Event)
            .where(Event.shift_id == shift_id)
            .options(selectinload(Event.machine))
            .order_by(Event.event_time.asc())
        )
        return list(result.scalars().all())

    async def count_by_setup_id(self, setup_id) -> int:
        result = await self.session.execute(
            select(func.count(Event.id)).where(Event.shift_setup_id == setup_id)
        )
        return int(result.scalar_one() or 0)
