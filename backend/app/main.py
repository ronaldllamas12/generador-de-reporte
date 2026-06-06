import asyncio
import sys

# Set event loop policy BEFORE any async imports
if sys.platform.startswith("win") and hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import os
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import UUID

import app.models.area  # noqa: F401
import app.models.event  # noqa: F401
import app.models.machine  # noqa: F401
import app.models.shift  # noqa: F401
import app.models.shift_machine_setup  # noqa: F401
import app.models.user  # noqa: F401
from app.api.v1.routers import admin, auth, events, machines, reports, shifts
from app.core.config import get_settings
from app.core.database import Base, engine
from app.models.machine import Machine
from app.models.user import User
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text

settings = get_settings()
STATIC_DIR = Path(__file__).resolve().parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

if hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

@asynccontextmanager
async def lifespan(app: FastAPI):
  
    yield


app = FastAPI(title=settings.project_name, lifespan=lifespan)

# Configure CORS origins via environment variable `ALLOWED_ORIGINS` (comma-separated).
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
else:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:65017",
        "http://127.0.0.1:65017",
        "https://generador-de-reporte.onrender.com",
        "https://generador-de-reporte.vercel.app"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.include_router(machines.router, prefix=settings.api_v1_prefix)
app.include_router(shifts.router, prefix=settings.api_v1_prefix)
app.include_router(events.router, prefix=settings.api_v1_prefix)
app.include_router(reports.router, prefix=settings.api_v1_prefix)
app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(admin.router, prefix=settings.api_v1_prefix)
