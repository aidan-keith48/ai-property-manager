from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Landlord, Property, Unit


def get_owned_property(db: Session, property_id: int, landlord: Landlord) -> Property:
    property_ = db.get(Property, property_id)
    if property_ is None or property_.landlord_id != landlord.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")
    return property_


def get_owned_unit(db: Session, unit_id: int, landlord: Landlord) -> Unit:
    unit = db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unit not found")
    get_owned_property(db, unit.property_id, landlord)
    return unit
