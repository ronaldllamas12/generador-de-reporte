from datetime import datetime, time
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Time
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    shift_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("shifts.id"), nullable=False
    )
    machine_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("machines.id"), nullable=True
    )
    shift_setup_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("shift_machine_setups.id"), nullable=True
    )
    event_time: Mapped[time] = mapped_column(Time, nullable=False)
    event_end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    image_path: Mapped[str] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    shift: Mapped["Shift"] = relationship(back_populates="events")
    machine: Mapped["Machine"] = relationship(back_populates="events")
