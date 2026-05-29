import asyncio
from collections.abc import AsyncGenerator

from app.core.config import get_settings
from sqlalchemy.ext.asyncio import (AsyncSession, async_sessionmaker,
                                    create_async_engine)
from sqlalchemy.orm import DeclarativeBase

if hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


settings = get_settings()
engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
    connect_args={"ssl": "require"},
)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
