from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.audit_log import ActorType


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_type: ActorType
    actor_id: int | None
    action: str
    entity_type: str
    entity_id: int
    timestamp: datetime
    log_metadata: dict
