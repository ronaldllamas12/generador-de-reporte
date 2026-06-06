from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ShiftMachineSetup(Base):
    __tablename__ = "shift_machine_setups"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    shift_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False)
    machine_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    order_status: Mapped[str] = mapped_column(String(20), default="open", nullable=False)

    machine_status: Mapped[str] = mapped_column(String(30), nullable=False)
    machine_status_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    work_order: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ref_order: Mapped[str | None] = mapped_column(String(120), nullable=True)
    meters_to_produce: Mapped[str | None] = mapped_column(String(30), nullable=True)
    product_to_laminate: Mapped[str | None] = mapped_column(String(120), nullable=True)

    img_materias_primas: Mapped[list | None] = mapped_column(JSON, nullable=True, default=[])
    img_condiciones_proceso: Mapped[list | None] = mapped_column(JSON, nullable=True, default=[])
    img_temp_secadores: Mapped[list | None] = mapped_column(JSON, nullable=True, default=[])
    img_extraccion_adhesivo: Mapped[list | None] = mapped_column(JSON, nullable=True, default=[])
    img_tiempo_paradas_turno_maquina: Mapped[list | None] = mapped_column(JSON, nullable=True, default=[])

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    shift: Mapped["Shift"] = relationship(back_populates="machine_setups")
    machine: Mapped["Machine"] = relationship(back_populates="shift_setups")
