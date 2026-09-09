from pathlib import Path
from typing import BinaryIO

from app.storage.base import StorageBackend


class LocalStorageBackend(StorageBackend):
    """Stores files on the local filesystem under `root`. Phase 1 only — see
    StorageBackend for the swap-out story to a real object store."""

    def __init__(self, root: str):
        self._root = Path(root).resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        path = (self._root / key).resolve()
        if self._root not in path.parents and path != self._root:
            raise ValueError(f"Invalid storage key escapes root: {key}")
        return path

    def save(self, key: str, file: BinaryIO) -> str:
        path = self._resolve(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as out:
            out.write(file.read())
        return str(path.relative_to(self._root))

    def read(self, key: str) -> bytes:
        return self._resolve(key).read_bytes()

    def delete(self, key: str) -> None:
        path = self._resolve(key)
        if path.exists():
            path.unlink()

    def exists(self, key: str) -> bool:
        return self._resolve(key).exists()
