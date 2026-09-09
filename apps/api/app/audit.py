from sqlalchemy.orm import Session

from app.models import ActorType, AuditLog, Unit


def unit_context(db: Session, unit_id: int) -> dict:
    """property_id/unit_id to fold into an audit entry's metadata so the
    per-property and per-unit activity feeds (Epic H1, Milestone 9) can
    find it — every audit entry that traces back to a unit should carry
    this, not just entries on the unit itself."""
    unit = db.get(Unit, unit_id)
    return {"unit_id": unit_id, "property_id": unit.property_id if unit is not None else None}


def log_action(
    db: Session,
    *,
    actor_type: ActorType,
    actor_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int,
    metadata: dict | None = None,
) -> AuditLog:
    """Adds an audit log row to the current session WITHOUT committing — the
    caller commits it together with the action it describes, so an action
    and its audit trail can never land in the database out of sync with
    each other."""
    entry = AuditLog(
        actor_type=actor_type,
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        log_metadata=metadata or {},
    )
    db.add(entry)
    return entry
