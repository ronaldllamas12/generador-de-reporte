from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import Area


class AreaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(self) -> list[Area]:
        result = await self.session.execute(select(Area).order_by(Area.name))
        return list(result.scalars().all())

    async def create(self, area: Area) -> Area:
        self.session.add(area)
        await self.session.commit()
        await self.session.refresh(area)
        return area

    async def get_by_id(self, area_id: UUID) -> Area | None:
        result = await self.session.execute(select(Area).where(Area.id == area_id))
        return result.scalar_one_or_none()

    async def get_by_ids(self, area_ids: list[UUID]) -> list[Area]:
        if not area_ids:
            return []

        result = await self.session.execute(select(Area).where(Area.id.in_(area_ids)))
        return list(result.scalars().all())

    async def get_by_name(self, name: str) -> Area | None:
        result = await self.session.execute(select(Area).where(Area.name == name))
        return result.scalar_one_or_none()

    async def update(self, area: Area) -> Area:
        await self.session.merge(area)
        await self.session.commit()
        await self.session.refresh(area)
        return area

    async def delete(self, area_id: UUID) -> bool:
        area = await self.get_by_id(area_id)
        if area:
            await self.session.delete(area)
            await self.session.commit()
            return True
        return False
