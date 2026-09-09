from sqlalchemy import JSON, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Landlord(Base, TimestampMixin):
    __tablename__ = "landlords"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50))
    notification_preferences: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    # Epic K2 — auto-approve thresholds. Schema-ready, opt-in only, unused in
    # Phase 1 (no autonomous approval exists until a landlord explicitly sets
    # this). See docs/engineering-plan.md §4.
    auto_approve_threshold_cents: Mapped[int | None] = mapped_column(Integer)
