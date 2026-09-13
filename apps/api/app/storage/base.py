from abc import ABC, abstractmethod


class StorageBackend(ABC):
    """Interface for file storage. Phase 1 uses LocalStorageBackend; swapping in
    an S3-compatible backend (DigitalOcean Spaces, AWS S3) later is a config
    change, not a rewrite — callers only ever depend on this interface."""

    @abstractmethod
    def save(self, key: str, content: bytes) -> str:
        """Persist `content` under `key`, returning the stored path/reference.

        Takes already-read bytes rather than a file-like object so callers
        are forced through app.uploads.validate_upload() (or another
        size-bounded read) first — there's no code path left that reads an
        upload straight onto disk unbounded."""

    @abstractmethod
    def read(self, key: str) -> bytes:
        """Return the raw bytes stored under `key`."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """Remove the file stored under `key`, if it exists."""

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Whether a file is currently stored under `key`."""
