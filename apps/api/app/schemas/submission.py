from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.submission import SubmissionStatus


class SubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    unit_id: int
    description: str
    photo_paths: list[str]
    status: SubmissionStatus
    classification: str | None
    urgency: str | None
    created_at: datetime
    updated_at: datetime
