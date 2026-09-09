from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LeaseDocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lease_id: int
    file_type: str
    uploaded_at: datetime
