from pydantic import BaseModel, ConfigDict


class PropertyCreate(BaseModel):
    name: str
    address: str


class PropertyUpdate(BaseModel):
    name: str | None = None
    address: str | None = None


class PropertyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str
    first_photo_id: int | None = None
    latitude: float | None = None
    longitude: float | None = None
