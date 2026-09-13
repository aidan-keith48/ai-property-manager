import mimetypes
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.audit import log_action
from app.auth.dependencies import require_landlord
from app.crud.authz import get_owned_property
from app.db import get_db
from app.models import ActorType, Landlord, PropertyPhoto
from app.schemas.property_photo import PropertyPhotoRead
from app.storage import get_storage
from app.storage.base import StorageBackend
from app.uploads import ALLOWED_IMAGE_TYPES, validate_upload

router = APIRouter(prefix="/properties/{property_id}/photos", tags=["property-photos"])


@router.post("", response_model=PropertyPhotoRead, status_code=status.HTTP_201_CREATED)
def upload_property_photo(
    property_id: int,
    file: UploadFile,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> PropertyPhoto:
    property_ = get_owned_property(db, property_id, landlord)
    content = validate_upload(file, allowed_content_types=ALLOWED_IMAGE_TYPES)

    key = f"property_photos/{property_.id}/{uuid4().hex}_{file.filename}"
    stored_path = storage.save(key, content)

    photo = PropertyPhoto(
        property_id=property_.id,
        file_path=stored_path,
        file_type=file.content_type or "application/octet-stream",
    )
    db.add(photo)
    db.flush()  # assign photo.id before it's referenced by the audit entry

    log_action(
        db,
        actor_type=ActorType.LANDLORD,
        actor_id=landlord.id,
        action="property_photo.upload",
        entity_type="property_photo",
        entity_id=photo.id,
        metadata={"property_id": property_.id},
    )

    db.commit()
    db.refresh(photo)
    return photo


@router.get("", response_model=list[PropertyPhotoRead])
def list_property_photos(
    property_id: int,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> list[PropertyPhoto]:
    get_owned_property(db, property_id, landlord)
    return db.query(PropertyPhoto).filter(PropertyPhoto.property_id == property_id).all()


@router.get("/{photo_id}")
def get_property_photo(
    property_id: int,
    photo_id: int,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> Response:
    get_owned_property(db, property_id, landlord)
    photo = db.get(PropertyPhoto, photo_id)
    if photo is None or photo.property_id != property_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")

    content = storage.read(photo.file_path)
    media_type = mimetypes.guess_type(photo.file_path)[0] or photo.file_type
    return Response(content=content, media_type=media_type)


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property_photo(
    property_id: int,
    photo_id: int,
    landlord: Landlord = Depends(require_landlord),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage),
) -> None:
    property_ = get_owned_property(db, property_id, landlord)
    photo = db.get(PropertyPhoto, photo_id)
    if photo is None or photo.property_id != property_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")

    storage.delete(photo.file_path)
    db.delete(photo)

    log_action(
        db,
        actor_type=ActorType.LANDLORD,
        actor_id=landlord.id,
        action="property_photo.delete",
        entity_type="property_photo",
        entity_id=photo_id,
        metadata={"property_id": property_.id},
    )

    db.commit()
