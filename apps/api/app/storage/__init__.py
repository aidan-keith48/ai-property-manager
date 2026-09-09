from functools import lru_cache

from app.config import settings
from app.storage.base import StorageBackend
from app.storage.local import LocalStorageBackend


@lru_cache
def get_storage() -> StorageBackend:
    if settings.storage_backend == "local":
        return LocalStorageBackend(settings.storage_local_root)
    raise ValueError(f"Unknown storage backend: {settings.storage_backend}")
