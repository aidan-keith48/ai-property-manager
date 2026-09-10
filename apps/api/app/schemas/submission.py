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


class SubmissionMessageCreate(BaseModel):
    content: str


class SubmissionStatusUpdate(BaseModel):
    status: SubmissionStatus


class SubmissionMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel: str
    direction: str
    content: str
    timestamp: datetime


class InboxSubmissionItem(BaseModel):
    id: int
    tenant_id: int
    tenant_name: str
    unit_id: int
    unit_label: str
    property_id: int
    property_name: str
    description: str
    status: SubmissionStatus
    classification: str | None
    urgency: str | None
    created_at: datetime
    message_count: int
    last_activity_at: datetime


class InboxSubmissionDetail(BaseModel):
    submission: SubmissionRead
    tenant_name: str
    unit_label: str
    property_name: str
    property_id: int
    messages: list[SubmissionMessageRead]
