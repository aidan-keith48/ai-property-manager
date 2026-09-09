from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class LeaseDocument(Base):
    __tablename__ = "lease_documents"

    # POPIA note: may include ID copies — sensitive personal information.
    # Access control + access logging on every read/write is implemented in
    # app/routers/lease_documents.py (Milestone 5 checkpoint). See
    # docs/compliance-lease-documents.md for the full stance (encryption at
    # rest, access logging, retention/deletion).
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lease_id: Mapped[int] = mapped_column(
        ForeignKey("leases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
