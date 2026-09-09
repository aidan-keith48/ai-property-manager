import hashlib
import secrets
from datetime import UTC, datetime, timedelta


def generate_raw_token() -> str:
    """The raw token — emailed to the tenant, never persisted. See
    hash_token() and docs/engineering-plan.md §6 ("Magic-link token storage")."""
    return secrets.token_urlsafe(32)


def hash_token(raw_token: str) -> str:
    """Only this hash is stored in magic_links.token_hash. DB read access
    alone is never enough to impersonate a tenant."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def new_expiry(minutes: int) -> datetime:
    return datetime.now(UTC) + timedelta(minutes=minutes)
