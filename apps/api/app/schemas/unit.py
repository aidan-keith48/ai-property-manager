from pydantic import BaseModel, ConfigDict


class UnitCreate(BaseModel):
    unit_label: str
    bedrooms: int | None = None
    bathrooms: int | None = None


class UnitUpdate(BaseModel):
    unit_label: str | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None


class UnitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    property_id: int
    unit_label: str
    bedrooms: int | None
    bathrooms: int | None
