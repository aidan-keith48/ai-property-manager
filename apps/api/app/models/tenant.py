from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # Denormalized read-optimization, NOT the source of truth for tenancy.
    # `leases` (status='active') is authoritative. This column must only ever
    # be written as a side effect, inside the same DB transaction, of the
    # lease-creation/lease-ending code path (see app/crud/lease.py, Milestone
    # 4) — never edited directly by any other code path or API consumer.
    # See docs/engineering-plan.md §6 ("Tenant↔Unit model").
    unit_id: Mapped[int | None] = mapped_column(
        ForeignKey("units.id", ondelete="SET NULL"), index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50))
