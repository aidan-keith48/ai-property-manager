from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class MagicLink(Base, TimestampMixin):
    __tablename__ = "magic_links"

    # Only the SHA-256 hash of the raw token is ever stored — the raw token
    # exists only in the tenant's email and in-flight over HTTPS. See
    # app/auth/magic_link.py (Milestone 3) and docs/engineering-plan.md §6.
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
