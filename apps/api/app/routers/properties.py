from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth.dependencies import require_landlord
from app.crud.authz import get_owned_property
from app.db import get_db
from app.models import ActorType, Landlord, Property, PropertyPhoto
from app.schemas.property import PropertyCreate, PropertyRead, PropertyUpdate

router = APIRouter(prefix="/properties", tags=["properties"])


def _first_photo_ids(db: Session, property_ids: list[int]) -> dict[int, int]:
    """The earliest-uploaded photo per property, one bulk query keyed by
    property id — avoids an N+1 when listing many properties."""
    if not property_ids:
        return {}
    rows = (
        db.query(PropertyPhoto.property_id, PropertyPhoto.id)
        .filter(PropertyPhoto.property_id.in_(property_ids))
        .order_by(PropertyPhoto.property_id, PropertyPhoto.uploaded_at.asc())
        .all()
    )
    result: dict[int, int] = {}
    for property_id, photo_id in rows:
        result.setdefault(property_id, photo_id)  # first row per id (asc) = earliest
    return result


def _to_property_read(property_: Property, first_photo_id: int | None) -> PropertyRead:
    return PropertyRead(
        id=property_.id,
        name=property_.name,
        address=property_.address,
        first_photo_id=first_photo_id,
    )


@router.post("", response_model=PropertyRead, status_code=status.HTTP_201_CREATED)
def create_property(
    payload: PropertyCreate,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> PropertyRead:
    property_ = Property(landlord_id=landlord.id, name=payload.name, address=payload.address)
    db.add(property_)
    db.flush()  # assign property_.id before it's referenced below

    log_action(
        db,
        actor_type=ActorType.LANDLORD,
        actor_id=landlord.id,
        action="property.create",
        entity_type="property",
        entity_id=property_.id,
        metadata={"property_id": property_.id},
    )

    db.commit()
    db.refresh(property_)
    return _to_property_read(property_, None)


@router.get("", response_model=list[PropertyRead])
def list_properties(
    landlord: Landlord = Depends(require_landlord), db: Session = Depends(get_db)
) -> list[PropertyRead]:
    properties = db.query(Property).filter(Property.landlord_id == landlord.id).all()
    first_photo_ids = _first_photo_ids(db, [p.id for p in properties])
    return [_to_property_read(p, first_photo_ids.get(p.id)) for p in properties]


@router.get("/{property_id}", response_model=PropertyRead)
def get_property(
    property_id: int,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> PropertyRead:
    property_ = get_owned_property(db, property_id, landlord)
    first_photo_id = _first_photo_ids(db, [property_.id]).get(property_.id)
    return _to_property_read(property_, first_photo_id)


@router.patch("/{property_id}", response_model=PropertyRead)
def update_property(
    property_id: int,
    payload: PropertyUpdate,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> PropertyRead:
    property_ = get_owned_property(db, property_id, landlord)
    if payload.name is not None:
        property_.name = payload.name
    if payload.address is not None:
        property_.address = payload.address

    log_action(
        db,
        actor_type=ActorType.LANDLORD,
        actor_id=landlord.id,
        action="property.update",
        entity_type="property",
        entity_id=property_.id,
        metadata={"property_id": property_.id},
    )

    db.commit()
    db.refresh(property_)
    first_photo_id = _first_photo_ids(db, [property_.id]).get(property_.id)
    return _to_property_read(property_, first_photo_id)


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: int,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> None:
    property_ = get_owned_property(db, property_id, landlord)

    log_action(
        db,
        actor_type=ActorType.LANDLORD,
        actor_id=landlord.id,
        action="property.delete",
        entity_type="property",
        entity_id=property_.id,
        metadata={"property_id": property_.id},
    )

    db.delete(property_)
    db.commit()
