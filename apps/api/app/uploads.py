from fastapi import HTTPException, UploadFile, status

from app.config import settings

ALLOWED_DOCUMENT_TYPES = {"application/pdf", "image/jpeg", "image/png"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}

_CHUNK_SIZE = 1024 * 1024


def validate_upload(file: UploadFile, *, allowed_content_types: set[str]) -> bytes:
    """Reads an uploaded file fully into memory, enforcing the shared
    content-type allow-list and size ceiling (settings.upload_max_bytes)
    along the way. Every upload endpoint (lease documents, submission
    photos, property photos) calls this rather than reading the file
    itself, so the limit lives in exactly one place.

    The size check bounds the read itself rather than trusting a
    client-supplied Content-Length header, which could be spoofed or
    simply absent. content_type is still client-supplied and in principle
    spoofable too — real content-sniffing (magic bytes) is a reasonable
    later hardening step, not required given every upload endpoint here
    is already authenticated.
    """
    if file.content_type not in allowed_content_types:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Unsupported file type: {file.content_type}",
        )

    max_bytes = settings.upload_max_bytes
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = file.file.read(_CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                f"File exceeds the {max_bytes // (1024 * 1024)}MB limit",
            )
        chunks.append(chunk)
    return b"".join(chunks)
