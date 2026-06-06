from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.shift import Shift
from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(self) -> list[User]:
        result = await self.session.execute(
            select(User).options(selectinload(User.areas)).order_by(User.full_name)
        )
        return list(result.scalars().all())

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user, attribute_names=["areas"])
        return user

    async def get_by_id(self, user_id: UUID) -> User | None:
        result = await self.session.execute(
            select(User).options(selectinload(User.areas)).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).options(selectinload(User.areas)).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def user_has_shifts(self, user_id: UUID) -> bool:
        result = await self.session.execute(
            select(Shift.id).where(Shift.user_id == user_id).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def update(self, user: User) -> User:
        await self.session.merge(user)
        await self.session.commit()
        await self.session.refresh(user, attribute_names=["areas"])
        return user

    async def delete(self, user_id: UUID) -> bool:
        user = await self.get_by_id(user_id)
        if user is None:
            return False

        if await self.user_has_shifts(user_id):
            raise ValueError("No se puede eliminar usuario con turnos asociados")

        await self.session.delete(user)
        await self.session.commit()
        return True
