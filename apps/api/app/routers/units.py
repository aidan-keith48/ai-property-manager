from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_landlord
from app.crud.authz import get_owned_property, get_owned_unit
from app.db import get_db
from app.models import Landlord, Unit
from app.schemas.unit import UnitCreate, UnitRead, UnitUpdate

router = APIRouter(tags=["units"])


@router.post(
    "/properties/{property_id}/units",
    response_model=UnitRead,
    status_code=status.HTTP_201_CREATED,
)
def create_unit(
    property_id: int,
    payload: UnitCreate,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> Unit:
    get_owned_property(db, property_id, landlord)
    unit = Unit(
        property_id=property_id,
        unit_label=payload.unit_label,
        bedrooms=payload.bedrooms,
        bathrooms=payload.bathrooms,
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/properties/{property_id}/units", response_model=list[UnitRead])
def list_units(
    property_id: int,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> list[Unit]:
    get_owned_property(db, property_id, landlord)
    return db.query(Unit).filter(Unit.property_id == property_id).all()


@router.get("/units/{unit_id}", response_model=UnitRead)
def get_unit(
    unit_id: int, landlord: Landlord = Depends(require_landlord), db: Session = Depends(get_db)
) -> Unit:
    return get_owned_unit(db, unit_id, landlord)


@router.patch("/units/{unit_id}", response_model=UnitRead)
def update_unit(
    unit_id: int,
    payload: UnitUpdate,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> Unit:
    unit = get_owned_unit(db, unit_id, landlord)
    if payload.unit_label is not None:
        unit.unit_label = payload.unit_label
    if payload.bedrooms is not None:
        unit.bedrooms = payload.bedrooms
    if payload.bathrooms is not None:
        unit.bathrooms = payload.bathrooms
    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(
    unit_id: int, landlord: Landlord = Depends(require_landlord), db: Session = Depends(get_db)
) -> None:
    unit = get_owned_unit(db, unit_id, landlord)
    db.delete(unit)
    db.commit()
