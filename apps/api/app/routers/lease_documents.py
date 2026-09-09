from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.audit import log_action, unit_context
from app.auth.dependencies import get_current_principal
from app.db import get_db
from app.models import ActorType, Lease, LeaseDocument, Property, Unit
from app.schemas.lease_document import LeaseDocumentRead
from app.storage import get_storage
from app.storage.base import StorageBackend

router = APIRouter(prefix="/leases/{lease_id}/documents", tags=["lease-documents"])


def _get_lease_for_principal(db: Session, lease_id: int, principal: dict) -> Lease:
    """Baseline access control for lease documents (which may include ID
    copies): only the owning landlord or the tenant on this specific lease.
    See docs/compliance-lease-documents.md for the full POPIA checkpoint
    (access logging, encryption-at-rest stance, retention/deletion)."""
    lease = db.get(Lease, lease_id)
    if lease is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lease not found")

    role = principal.get("role")
    if role == "landlord":
        unit = db.get(Unit, lease.unit_id)
        property_ = db.get(Property, unit.property_id) if unit is not None else None
        if property_ is None or property_.landlord_id != int(principal["sub"]):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this lease")
    elif role == "tenant":
        if lease.tenant_id != int(principal["sub"]):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this lease")
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not authorized for this lease")

    return lease


def _actor_from_principal(principal: dict) -> tuple[ActorType, int]:
    return ActorType(principal["role"]), int(principal["sub"])


@router.post("", response_model=LeaseDocumentRead, status_code=status.HTTP_201_CREATED)
def upload_lease_document(
    lease_id: int,
    file: UploadFile,
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> LeaseDocument:
    lease = _get_lease_for_principal(db, lease_id, principal)
    if principal.get("role") != "landlord":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only the landlord can upload lease documents"
        )

    key = f"lease_documents/{lease.id}/{file.filename}"
    stored_path = storage.save(key, file.file)

    document = LeaseDocument(
        lease_id=lease.id,
        file_path=stored_path,
        file_type=file.content_type or "application/octet-stream",
    )
    db.add(document)
    db.flush()  # assign document.id before it's referenced by the audit entry

    actor_type, actor_id = _actor_from_principal(principal)
    log_action(
        db,
        actor_type=actor_type,
        actor_id=actor_id,
        action="lease_document.upload",
        entity_type="lease_document",
        entity_id=document.id,
        metadata={
            **unit_context(db, lease.unit_id),
            "lease_id": lease.id,
            "file_type": document.file_type,
        },
    )

    db.commit()
    db.refresh(document)
    return document


@router.get("", response_model=list[LeaseDocumentRead])
def list_lease_documents(
    lease_id: int,
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
) -> list[LeaseDocument]:
    _get_lease_for_principal(db, lease_id, principal)
    return db.query(LeaseDocument).filter(LeaseDocument.lease_id == lease_id).all()


@router.get("/{document_id}/download")
def download_lease_document(
    lease_id: int,
    document_id: int,
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> Response:
    lease = _get_lease_for_principal(db, lease_id, principal)
    document = db.get(LeaseDocument, document_id)
    if document is None or document.lease_id != lease_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    content = storage.read(document.file_path)

    # POPIA checkpoint: every read of a lease document (which may be an ID
    # copy) is logged, regardless of whether the reader is the landlord or
    # the tenant. See docs/compliance-lease-documents.md.
    actor_type, actor_id = _actor_from_principal(principal)
    log_action(
        db,
        actor_type=actor_type,
        actor_id=actor_id,
        action="lease_document.download",
        entity_type="lease_document",
        entity_id=document.id,
        metadata={**unit_context(db, lease.unit_id), "lease_id": lease_id},
    )
    db.commit()

    return Response(content=content, media_type=document.file_type)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lease_document(
    lease_id: int,
    document_id: int,
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> None:
    """Enacts the landlord's right to delete a lease document (e.g. an ID
    copy no longer needed after a lease ends) — see the retention/deletion
    stance in docs/compliance-lease-documents.md. Landlord-only: a tenant
    downloading their own documents has no deletion authority over them."""
    lease = _get_lease_for_principal(db, lease_id, principal)
    if principal.get("role") != "landlord":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only the landlord can delete lease documents"
        )

    document = db.get(LeaseDocument, document_id)
    if document is None or document.lease_id != lease_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")

    storage.delete(document.file_path)
    db.delete(document)

    actor_type, actor_id = _actor_from_principal(principal)
    log_action(
        db,
        actor_type=actor_type,
        actor_id=actor_id,
        action="lease_document.delete",
        entity_type="lease_document",
        entity_id=document_id,
        metadata={**unit_context(db, lease.unit_id), "lease_id": lease_id},
    )
    db.commit()
