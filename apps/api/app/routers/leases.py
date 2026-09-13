from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_landlord
from app.crud.authz import get_owned_unit
from app.crud.lease import create_lease as create_lease_record
from app.crud.lease import end_lease as end_lease_record
from app.db import get_db
from app.models import AuditLog, Landlord, Lease, Property, Unit
from app.schemas.lease import LeaseCreate, LeaseEndRequest, LeaseRead

router = APIRouter(prefix="/leases", tags=["leases"])


def _get_owned_lease(db: Session, lease_id: int, landlord: Landlord) -> Lease:
    lease = db.get(Lease, lease_id)
    if lease is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lease not found")
    get_owned_unit(db, lease.unit_id, landlord)
    return lease


def _ended_ats(db: Session, lease_ids: list[int]) -> dict[int, datetime]:
    """The exact moment each lease was ended, read back from the audit log
    rather than duplicating a timestamp column — end_lease() already writes
    an AuditLog row per lease.end. One bulk query keyed by lease id avoids
    an N+1 when listing many leases."""
    if not lease_ids:
        return {}
    rows = (
        db.query(AuditLog.entity_id, AuditLog.timestamp)
        .filter(
            AuditLog.entity_type == "lease",
            AuditLog.entity_id.in_(lease_ids),
            AuditLog.action == "lease.end",
        )
        .order_by(AuditLog.entity_id, AuditLog.timestamp.desc())
        .all()
    )
    result: dict[int, datetime] = {}
    for entity_id, timestamp in rows:
        result.setdefault(entity_id, timestamp)  # first row per id (desc) = latest
    return result


def _to_lease_read(lease: Lease, ended_at: datetime | None) -> LeaseRead:
    return LeaseRead(
        id=lease.id,
        unit_id=lease.unit_id,
        tenant_id=lease.tenant_id,
        start_date=lease.start_date,
        end_date=lease.end_date,
        rent_amount=lease.rent_amount,
        status=lease.status,
        ended_at=ended_at,
    )


@router.post("", response_model=LeaseRead, status_code=status.HTTP_201_CREATED)
def create_lease(
    payload: LeaseCreate,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> LeaseRead:
    get_owned_unit(db, payload.unit_id, landlord)
    lease = create_lease_record(
        db,
        unit_id=payload.unit_id,
        tenant_id=payload.tenant_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        rent_amount=payload.rent_amount,
        actor_landlord_id=landlord.id,
    )
    return _to_lease_read(lease, None)


@router.get("", response_model=list[LeaseRead])
def list_leases(
    landlord: Landlord = Depends(require_landlord), db: Session = Depends(get_db)
) -> list[LeaseRead]:
    leases = (
        db.query(Lease)
        .join(Unit, Lease.unit_id == Unit.id)
        .join(Property, Unit.property_id == Property.id)
        .filter(Property.landlord_id == landlord.id)
        .all()
    )
    ended_ats = _ended_ats(db, [lease.id for lease in leases])
    return [_to_lease_read(lease, ended_ats.get(lease.id)) for lease in leases]


@router.get("/{lease_id}", response_model=LeaseRead)
def get_lease(
    lease_id: int, landlord: Landlord = Depends(require_landlord), db: Session = Depends(get_db)
) -> LeaseRead:
    lease = _get_owned_lease(db, lease_id, landlord)
    ended_at = _ended_ats(db, [lease.id]).get(lease.id)
    return _to_lease_read(lease, ended_at)


@router.post("/{lease_id}/end", response_model=LeaseRead)
def end_lease(
    lease_id: int,
    payload: LeaseEndRequest,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> LeaseRead:
    lease = _get_owned_lease(db, lease_id, landlord)
    lease = end_lease_record(db, lease, end_date=payload.end_date, actor_landlord_id=landlord.id)
    ended_at = _ended_ats(db, [lease.id]).get(lease.id)
    return _to_lease_read(lease, ended_at)
