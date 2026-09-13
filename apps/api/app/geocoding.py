import httpx

from app.config import settings

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


def geocode_address(address: str) -> tuple[float, float] | None:
    """Best-effort address -> (latitude, longitude) via OpenStreetMap's free
    Nominatim service. Returns None on any failure — no match, network
    error, timeout, malformed response — and never raises, so a property
    create/update is never blocked by a geocoding hiccup.

    Nominatim's usage policy caps this at ~1 request/second and asks for a
    descriptive User-Agent (set via settings.geocoding_user_agent) — fine
    for a landlord occasionally adding/editing a property, since this only
    runs on create or when the address actually changes, not on every read.
    """
    try:
        response = httpx.get(
            NOMINATIM_URL,
            params={"q": address, "format": "json", "limit": 1},
            headers={"User-Agent": settings.geocoding_user_agent},
            timeout=5.0,
        )
        response.raise_for_status()
        results = response.json()
    except (httpx.HTTPError, ValueError):
        return None

    if not results:
        return None

    try:
        return float(results[0]["lat"]), float(results[0]["lon"])
    except (KeyError, TypeError, ValueError):
        return None
