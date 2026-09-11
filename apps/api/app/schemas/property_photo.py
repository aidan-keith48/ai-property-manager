from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PropertyPhotoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    property_id: int
    file_type: str
    uploaded_at: datetime
