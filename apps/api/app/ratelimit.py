from collections.abc import Callable
from functools import lru_cache

import redis
from fastapi import HTTPException, Request, status

from app.config import settings


@lru_cache
def get_redis() -> redis.Redis:
    return redis.from_url(settings.redis_url, decode_responses=True)


def rate_limit(key_prefix: str, *, max_requests: int, window_seconds: int) -> Callable:
    """Fixed-window rate limiter keyed by client IP, backed by Redis (per
    the architecture doc's "rate limiting on the tenant portal to prevent
    abuse"). A single INCR+EXPIRE pair keeps this cheap and simple — Phase 1
    doesn't need a sliding-window algorithm at this traffic scale.

    Used as a FastAPI dependency: Depends(rate_limit("magic_link_request",
    max_requests=5, window_seconds=900))."""

    def dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{key_prefix}:{client_ip}"

        client = get_redis()
        current = client.incr(key)
        if current == 1:
            client.expire(key, window_seconds)

        if current > max_requests:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Too many requests. Please try again later.",
            )

    return dependency
