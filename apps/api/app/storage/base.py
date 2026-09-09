from abc import ABC, abstractmethod
from typing import BinaryIO


class StorageBackend(ABC):
    """Interface for file storage. Phase 1 uses LocalStorageBackend; swapping in
    an S3-compatible backend (DigitalOcean Spaces, AWS S3) later is a config
    change, not a rewrite — callers only ever depend on this interface."""

    @abstractmethod
    def save(self, key: str, file: BinaryIO) -> str:
        """Persist a file under `key`, returning the stored path/reference."""

    @abstractmethod
    def read(self, key: str) -> bytes:
        """Return the raw bytes stored under `key`."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """Remove the file stored under `key`, if it exists."""

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Whether a file is currently stored under `key`."""
