from datetime import datetime
from uuid import UUID, uuid4

from app.core.database import Base
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Machine(Base):
    __tablename__ = "machines"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)
    area_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("areas.id"), nullable=True)
    current_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    current_status_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    shifts: Mapped[list["Shift"]] = relationship(back_populates="machine")
    events: Mapped[list["Event"]] = relationship(back_populates="machine")
    shift_setups: Mapped[list["ShiftMachineSetup"]] = relationship(back_populates="machine")
    area: Mapped["Area"] = relationship(back_populates="machines")
