import enum
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ActorType(str, enum.Enum):
    LANDLORD = "landlord"
    TENANT = "tenant"
    SYSTEM = "system"
    # "ai" is intentionally not a value yet — no AI actor exists until Phase 2
    # (Epic C/D), and every AI action must still resolve to a human approval
    # per the PRD's human-in-the-loop principle before it's logged as taken.


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_type: Mapped[ActorType] = mapped_column(
        Enum(ActorType, name="actor_type"), nullable=False
    )
    actor_id: Mapped[int | None] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    log_metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
