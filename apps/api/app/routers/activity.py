from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_landlord
from app.crud.authz import get_owned_property, get_owned_unit
from app.db import get_db
from app.models import AuditLog, Landlord
from app.schemas.audit import AuditLogRead

router = APIRouter(tags=["activity"])

# Filtering by metadata->>'property_id' / 'unit_id' is done in Python after
# a single bounded query, not via dialect-specific JSON operators — at
# Phase 1 scale (2-15 units per landlord) this is simpler and just as
# correct, and ownership is already enforced before the query runs (a
# landlord can only ever ask for a property_id/unit_id they own, via
# get_owned_property/get_owned_unit below), so there's no cross-landlord
# leak risk from filtering in application code instead of SQL.


@router.get("/properties/{property_id}/activity", response_model=list[AuditLogRead])
def get_property_activity(
    property_id: int,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> list[AuditLog]:
    """Epic H1: every submission, message, and action recorded — automatic,
    timestamped, no manual data entry. Includes the property's own
    create/update/delete plus everything that happened on its units,
    tenants-while-assigned, leases, lease documents, and submissions."""
    get_owned_property(db, property_id, landlord)
    entries = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    return [e for e in entries if e.log_metadata.get("property_id") == property_id]


@router.get("/units/{unit_id}/activity", response_model=list[AuditLogRead])
def get_unit_activity(
    unit_id: int,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> list[AuditLog]:
    get_owned_unit(db, unit_id, landlord)
    entries = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    return [e for e in entries if e.log_metadata.get("unit_id") == unit_id]
