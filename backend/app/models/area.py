from datetime import datetime
from uuid import UUID, uuid4

from app.core.database import Base
from sqlalchemy import Column, DateTime, ForeignKey, String, Table
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

user_area_association = Table(
    "user_areas",
    Base.metadata,
    Column("user_id", PGUUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
    Column("area_id", PGUUID(as_uuid=True), ForeignKey("areas.id"), primary_key=True),
)


class Area(Base):
    __tablename__ = "areas"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    machines: Mapped[list["Machine"]] = relationship(back_populates="area")
    users: Mapped[list["User"]] = relationship("User", secondary=user_area_association, back_populates="areas")
