from datetime import datetime, time
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.event import EventRead
from app.services.event_service import EventService

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/multipart", response_model=EventRead, status_code=201)
async def create_event_with_image(
    shift_id: UUID = Form(...),
    machine_id: UUID | None = Form(None),
    description: str = Form(...),
    event_time: time = Form(...),
    event_end_time: time | None = Form(None),
    image: UploadFile | None = File(None),
    session: AsyncSession = Depends(get_db),
):
    service = EventService(session)
    try:
        return await service.create_event(
            shift_id=shift_id,
            machine_id=machine_id,
            description=description,
            event_time=event_time,
            event_end_time=event_end_time,
            image=image,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
