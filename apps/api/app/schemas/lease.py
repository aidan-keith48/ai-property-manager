from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.lease import LeaseStatus


class LeaseCreate(BaseModel):
    unit_id: int
    tenant_id: int
    start_date: date
    end_date: date | None = None
    rent_amount: float


class LeaseEndRequest(BaseModel):
    end_date: date | None = None


class LeaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    unit_id: int
    tenant_id: int
    start_date: date
    end_date: date | None
    rent_amount: float
    status: LeaseStatus
    ended_at: datetime | None = None
