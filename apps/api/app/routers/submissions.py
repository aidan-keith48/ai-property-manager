from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth.dependencies import require_tenant
from app.db import get_db
from app.models import ActorType, CommunicationLog, Submission, Tenant
from app.schemas.submission import SubmissionRead
from app.storage import get_storage
from app.storage.base import StorageBackend

router = APIRouter(prefix="/submissions", tags=["submissions"])

ACKNOWLEDGMENT_MESSAGE = (
    "We've received your submission and will get back to you soon."
)


@router.post("", response_model=SubmissionRead, status_code=status.HTTP_201_CREATED)
async def create_submission(
    description: str = Form(...),
    photos: list[UploadFile] = File(default=[]),
    tenant: Tenant = Depends(require_tenant),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> Submission:
    # Epic A1: text + photo intake only in Phase 1 (voice/video are P1/P2).
    if tenant.unit_id is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "You are not currently assigned to a unit"
        )

    photo_paths: list[str] = []
    for photo in photos:
        if not photo.filename:
            continue
        key = f"submissions/{tenant.id}/{uuid4().hex}_{photo.filename}"
        photo_paths.append(storage.save(key, photo.file))

    submission = Submission(
        tenant_id=tenant.id,
        unit_id=tenant.unit_id,
        description=description,
        photo_paths=photo_paths,
    )
    db.add(submission)
    db.flush()  # assign submission.id before it's referenced below

    log_action(
        db,
        actor_type=ActorType.TENANT,
        actor_id=tenant.id,
        action="submission.create",
        entity_type="submission",
        entity_id=submission.id,
        metadata={"unit_id": tenant.unit_id, "photo_count": len(photo_paths)},
    )

    # Epic A4: automatic acknowledgment message. No email/SMS provider is
    # wired up yet (Epic J, Phase 2) — this lands in communication_log so
    # it's visible in-app and ready to feed Milestone 8's inbox.
    db.add(
        CommunicationLog(
            related_entity_type="submission",
            related_entity_id=submission.id,
            channel="portal",
            direction="outbound",
            content=ACKNOWLEDGMENT_MESSAGE,
        )
    )

    db.commit()
    db.refresh(submission)
    return submission


@router.get("/{submission_id}", response_model=SubmissionRead)
def get_submission(
    submission_id: int,
    tenant: Tenant = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> Submission:
    submission = db.get(Submission, submission_id)
    if submission is None or submission.tenant_id != tenant.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission not found")
    return submission
