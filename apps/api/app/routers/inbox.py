from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.audit import log_action, unit_context
from app.auth.dependencies import require_landlord
from app.crud.authz import get_owned_unit
from app.db import get_db
from app.models import ActorType, CommunicationLog, Landlord, Property, Submission, Tenant, Unit
from app.schemas.submission import (
    InboxSubmissionDetail,
    InboxSubmissionItem,
    SubmissionMessageCreate,
    SubmissionMessageRead,
    SubmissionRead,
)

router = APIRouter(prefix="/inbox", tags=["inbox"])


def _get_owned_submission(db: Session, submission_id: int, landlord: Landlord) -> Submission:
    submission = db.get(Submission, submission_id)
    if submission is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission not found")
    get_owned_unit(db, submission.unit_id, landlord)
    return submission


def _thread_stats(db: Session, submission_id: int) -> tuple[int, object]:
    message_count = (
        db.query(func.count(CommunicationLog.id))
        .filter(
            CommunicationLog.related_entity_type == "submission",
            CommunicationLog.related_entity_id == submission_id,
        )
        .scalar()
        or 0
    )
    last_activity_at = (
        db.query(func.max(CommunicationLog.timestamp))
        .filter(
            CommunicationLog.related_entity_type == "submission",
            CommunicationLog.related_entity_id == submission_id,
        )
        .scalar()
    )
    return message_count, last_activity_at


@router.get("", response_model=list[InboxSubmissionItem])
def list_inbox(
    property_id: int | None = None,
    tenant_id: int | None = None,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> list[InboxSubmissionItem]:
    """Epic B1/B2: aggregates tenant submissions (no contractor replies or
    system notices yet — Epic E/G are Phase 2) with per-property/per-tenant
    filtering, ordered by most recent thread activity."""
    query = (
        db.query(Submission, Tenant, Unit, Property)
        .join(Tenant, Submission.tenant_id == Tenant.id)
        .join(Unit, Submission.unit_id == Unit.id)
        .join(Property, Unit.property_id == Property.id)
        .filter(Property.landlord_id == landlord.id)
    )
    if property_id is not None:
        query = query.filter(Property.id == property_id)
    if tenant_id is not None:
        query = query.filter(Tenant.id == tenant_id)

    items: list[InboxSubmissionItem] = []
    for submission, tenant, unit, property_ in query.all():
        message_count, last_activity_at = _thread_stats(db, submission.id)
        items.append(
            InboxSubmissionItem(
                id=submission.id,
                tenant_id=tenant.id,
                tenant_name=tenant.name,
                unit_id=unit.id,
                unit_label=unit.unit_label,
                property_id=property_.id,
                property_name=property_.name,
                description=submission.description,
                status=submission.status,
                classification=submission.classification,
                urgency=submission.urgency,
                created_at=submission.created_at,
                message_count=message_count,
                last_activity_at=last_activity_at or submission.created_at,
            )
        )

    items.sort(key=lambda i: i.last_activity_at, reverse=True)
    return items


@router.get("/{submission_id}", response_model=InboxSubmissionDetail)
def get_inbox_submission(
    submission_id: int,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> InboxSubmissionDetail:
    submission = _get_owned_submission(db, submission_id, landlord)
    tenant = db.get(Tenant, submission.tenant_id)
    unit = db.get(Unit, submission.unit_id)
    property_ = db.get(Property, unit.property_id)
    messages = (
        db.query(CommunicationLog)
        .filter(
            CommunicationLog.related_entity_type == "submission",
            CommunicationLog.related_entity_id == submission.id,
        )
        .order_by(CommunicationLog.timestamp.asc())
        .all()
    )
    return InboxSubmissionDetail(
        submission=SubmissionRead.model_validate(submission),
        tenant_name=tenant.name,
        unit_label=unit.unit_label,
        property_name=property_.name,
        property_id=property_.id,
        messages=[SubmissionMessageRead.model_validate(m) for m in messages],
    )


@router.post(
    "/{submission_id}/messages",
    response_model=SubmissionMessageRead,
    status_code=status.HTTP_201_CREATED,
)
def reply_to_submission(
    submission_id: int,
    payload: SubmissionMessageCreate,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> CommunicationLog:
    """A landlord-authored reply. Never AI-drafted — that's Epic D
    (Phase 2), and even then would require explicit landlord approval
    before sending per the PRD's human-in-the-loop principle."""
    submission = _get_owned_submission(db, submission_id, landlord)

    message = CommunicationLog(
        related_entity_type="submission",
        related_entity_id=submission.id,
        channel="portal",
        direction="outbound",
        content=payload.content,
    )
    db.add(message)
    db.flush()  # assign message.id before it's referenced below

    log_action(
        db,
        actor_type=ActorType.LANDLORD,
        actor_id=landlord.id,
        action="inbox.reply",
        entity_type="submission",
        entity_id=submission.id,
        metadata={**unit_context(db, submission.unit_id), "message_id": message.id},
    )

    db.commit()
    db.refresh(message)
    return message
