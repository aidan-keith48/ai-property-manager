from sqlalchemy.orm import Session

from app.models import ActorType, AuditLog


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
