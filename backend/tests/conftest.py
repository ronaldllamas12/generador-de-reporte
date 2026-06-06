import os
import asyncio
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///{BASE_DIR / 'test.db'}")
os.environ.setdefault("ENABLE_DEMO_SEED", "false")

import pytest
from httpx import AsyncClient, ASGITransport

from app.core.database import Base, engine
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def prepare_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
