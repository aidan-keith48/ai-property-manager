from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_landlord
from app.crud.authz import get_owned_unit
from app.crud.lease import create_lease as create_lease_record
from app.crud.lease import end_lease as end_lease_record
from app.db import get_db
from app.models import Landlord, Lease, Property, Unit
from app.schemas.lease import LeaseCreate, LeaseEndRequest, LeaseRead

router = APIRouter(prefix="/leases", tags=["leases"])


def _get_owned_lease(db: Session, lease_id: int, landlord: Landlord) -> Lease:
    lease = db.get(Lease, lease_id)
    if lease is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lease not found")
    get_owned_unit(db, lease.unit_id, landlord)
    return lease


@router.post("", response_model=LeaseRead, status_code=status.HTTP_201_CREATED)
def create_lease(
    payload: LeaseCreate,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> Lease:
    get_owned_unit(db, payload.unit_id, landlord)
    return create_lease_record(
        db,
        unit_id=payload.unit_id,
        tenant_id=payload.tenant_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        rent_amount=payload.rent_amount,
    )


@router.get("", response_model=list[LeaseRead])
def list_leases(
    landlord: Landlord = Depends(require_landlord), db: Session = Depends(get_db)
) -> list[Lease]:
    return (
        db.query(Lease)
        .join(Unit, Lease.unit_id == Unit.id)
        .join(Property, Unit.property_id == Property.id)
        .filter(Property.landlord_id == landlord.id)
        .all()
    )


@router.get("/{lease_id}", response_model=LeaseRead)
def get_lease(
    lease_id: int, landlord: Landlord = Depends(require_landlord), db: Session = Depends(get_db)
) -> Lease:
    return _get_owned_lease(db, lease_id, landlord)


@router.post("/{lease_id}/end", response_model=LeaseRead)
def end_lease(
    lease_id: int,
    payload: LeaseEndRequest,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> Lease:
    lease = _get_owned_lease(db, lease_id, landlord)
    return end_lease_record(db, lease, end_date=payload.end_date)
