from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.audit import log_action
from app.models import ActorType, Lease, LeaseStatus, Tenant, Unit


def create_lease(
    db: Session,
    *,
    unit_id: int,
    tenant_id: int,
    start_date: date,
    end_date: date | None,
    rent_amount: float,
    actor_landlord_id: int,
) -> Lease:
    """The only code path allowed to set tenant.unit_id. The lease insert and
    the tenant.unit_id update happen in the same DB transaction (one commit)
    so they can never observably diverge — see docs/engineering-plan.md §6
    ("Tenant↔Unit model")."""
    unit = db.get(Unit, unit_id)
    if unit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unit not found")

    tenant = db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tenant not found")
    if tenant.unit_id is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Tenant already has an active lease")

    existing_active = (
        db.query(Lease)
        .filter(Lease.unit_id == unit_id, Lease.status == LeaseStatus.ACTIVE)
        .first()
    )
    if existing_active is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Unit already has an active lease")

    lease = Lease(
        unit_id=unit_id,
        tenant_id=tenant_id,
        start_date=start_date,
        end_date=end_date,
        rent_amount=rent_amount,
        status=LeaseStatus.ACTIVE,
    )
    db.add(lease)
    tenant.unit_id = unit_id
    db.flush()  # assign lease.id before it's referenced below

    log_action(
        db,
        actor_type=ActorType.LANDLORD,
        actor_id=actor_landlord_id,
        action="lease.create",
        entity_type="lease",
        entity_id=lease.id,
        metadata={"unit_id": unit_id, "property_id": unit.property_id, "tenant_id": tenant_id},
    )

    db.commit()
    db.refresh(lease)
    return lease


def end_lease(
    db: Session, lease: Lease, *, end_date: date | None = None, actor_landlord_id: int
) -> Lease:
    """The only code path allowed to clear tenant.unit_id. See create_lease().

    end_date defaults to today when omitted — a lease that has ended always
    has an end date, that's not just a UI convention. When a caller does
    supply one explicitly, it must not precede the lease's own start_date."""
    if end_date is not None and end_date < lease.start_date:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "End date can't be before the lease start date",
        )
    lease.status = LeaseStatus.ENDED
    lease.end_date = end_date if end_date is not None else date.today()

    tenant = db.get(Tenant, lease.tenant_id)
    if tenant is not None and tenant.unit_id == lease.unit_id:
        tenant.unit_id = None

    unit = db.get(Unit, lease.unit_id)
    log_action(
        db,
        actor_type=ActorType.LANDLORD,
        actor_id=actor_landlord_id,
        action="lease.end",
        entity_type="lease",
        entity_id=lease.id,
        metadata={
            "unit_id": lease.unit_id,
            "property_id": unit.property_id if unit is not None else None,
            "tenant_id": lease.tenant_id,
        },
    )

    db.commit()
    db.refresh(lease)
    return lease
