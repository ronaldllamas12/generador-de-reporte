from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    machine_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("machines.id"), nullable=False)
    area: Mapped[str] = mapped_column(String(120), nullable=False)
    shift_number: Mapped[int] = mapped_column(Integer, nullable=False)
    shift_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active", nullable=False)
    pdf_url: Mapped[str] = mapped_column(String(255), nullable=True)
    # Setup fields (populated via /shifts/{id}/setup)
    machine_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    machine_status_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    work_order: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ref_order: Mapped[str | None] = mapped_column(String(120), nullable=True)
    meters_to_produce: Mapped[str | None] = mapped_column(String(30), nullable=True)
    product_to_laminate: Mapped[str | None] = mapped_column(String(120), nullable=True)
    img_materias_primas: Mapped[list | None] = mapped_column(JSON, nullable=True, default=[])
    img_condiciones_proceso: Mapped[list | None] = mapped_column(JSON, nullable=True, default=[])
    img_temp_secadores: Mapped[list | None] = mapped_column(JSON, nullable=True, default=[])
    img_extraccion_adhesivo: Mapped[list | None] = mapped_column(JSON, nullable=True, default=[])
    img_tiempo_paradas_turno: Mapped[list | None] = mapped_column(JSON, nullable=True, default=[])
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="shifts")
    machine: Mapped["Machine"] = relationship(back_populates="shifts")
    events: Mapped[list["Event"]] = relationship(back_populates="shift", cascade="all, delete-orphan")
    machine_setups: Mapped[list["ShiftMachineSetup"]] = relationship(
        back_populates="shift", cascade="all, delete-orphan"
    )
