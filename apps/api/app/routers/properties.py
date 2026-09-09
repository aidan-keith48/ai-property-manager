from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_landlord
from app.crud.authz import get_owned_property
from app.db import get_db
from app.models import Landlord, Property
from app.schemas.property import PropertyCreate, PropertyRead, PropertyUpdate

router = APIRouter(prefix="/properties", tags=["properties"])


@router.post("", response_model=PropertyRead, status_code=status.HTTP_201_CREATED)
def create_property(
    payload: PropertyCreate,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> Property:
    property_ = Property(landlord_id=landlord.id, name=payload.name, address=payload.address)
    db.add(property_)
    db.commit()
    db.refresh(property_)
    return property_


@router.get("", response_model=list[PropertyRead])
def list_properties(
    landlord: Landlord = Depends(require_landlord), db: Session = Depends(get_db)
) -> list[Property]:
    return db.query(Property).filter(Property.landlord_id == landlord.id).all()


@router.get("/{property_id}", response_model=PropertyRead)
def get_property(
    property_id: int,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> Property:
    return get_owned_property(db, property_id, landlord)


@router.patch("/{property_id}", response_model=PropertyRead)
def update_property(
    property_id: int,
    payload: PropertyUpdate,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> Property:
    property_ = get_owned_property(db, property_id, landlord)
    if payload.name is not None:
        property_.name = payload.name
    if payload.address is not None:
        property_.address = payload.address
    db.commit()
    db.refresh(property_)
    return property_


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: int,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> None:
    property_ = get_owned_property(db, property_id, landlord)
    db.delete(property_)
    db.commit()
