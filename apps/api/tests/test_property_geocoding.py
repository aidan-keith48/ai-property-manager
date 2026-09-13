import httpx
import respx

from app.config import settings
from app.geocoding import NOMINATIM_URL


@respx.mock
def test_creating_property_geocodes_address(client, landlord_token, monkeypatch):
    monkeypatch.setattr(settings, "geocoding_enabled", True)
    route = respx.get(NOMINATIM_URL).mock(
        return_value=httpx.Response(200, json=[{"lat": "-33.9249", "lon": "18.4241"}])
    )

    resp = client.post(
        "/properties",
        json={"name": "Table Mountain View", "address": "1 Long Street, Cape Town"},
        headers=landlord_token(),
    )
    assert resp.status_code == 201
    assert route.called
    assert resp.json()["latitude"] == -33.9249
    assert resp.json()["longitude"] == 18.4241


@respx.mock
def test_no_match_leaves_coordinates_null_and_still_creates(client, landlord_token, monkeypatch):
    monkeypatch.setattr(settings, "geocoding_enabled", True)
    respx.get(NOMINATIM_URL).mock(return_value=httpx.Response(200, json=[]))

    resp = client.post(
        "/properties",
        json={"name": "Nowhere Building", "address": "asdkjfh nonsense address"},
        headers=landlord_token(),
    )
    assert resp.status_code == 201
    assert resp.json()["latitude"] is None
    assert resp.json()["longitude"] is None


@respx.mock
def test_network_error_leaves_coordinates_null_and_still_creates(
    client, landlord_token, monkeypatch
):
    monkeypatch.setattr(settings, "geocoding_enabled", True)
    respx.get(NOMINATIM_URL).mock(side_effect=httpx.ConnectTimeout("timed out"))

    resp = client.post(
        "/properties",
        json={"name": "Timeout Building", "address": "Somewhere"},
        headers=landlord_token(),
    )
    assert resp.status_code == 201
    assert resp.json()["latitude"] is None
    assert resp.json()["longitude"] is None


@respx.mock
def test_updating_only_name_does_not_regeocode(client, landlord_token, monkeypatch):
    monkeypatch.setattr(settings, "geocoding_enabled", True)
    route = respx.get(NOMINATIM_URL).mock(
        return_value=httpx.Response(200, json=[{"lat": "1.0", "lon": "2.0"}])
    )
    headers = landlord_token()

    create = client.post(
        "/properties", json={"name": "Original", "address": "1 Somewhere St"}, headers=headers
    )
    property_id = create.json()["id"]
    assert route.call_count == 1

    update = client.patch(
        f"/properties/{property_id}", json={"name": "Renamed"}, headers=headers
    )
    assert update.status_code == 200
    assert route.call_count == 1  # unchanged — address wasn't touched
    assert update.json()["latitude"] == 1.0
    assert update.json()["longitude"] == 2.0


@respx.mock
def test_updating_address_regeocodes_and_clears_stale_coordinates_on_failure(
    client, landlord_token, monkeypatch
):
    monkeypatch.setattr(settings, "geocoding_enabled", True)
    headers = landlord_token()

    respx.get(NOMINATIM_URL).mock(
        return_value=httpx.Response(200, json=[{"lat": "1.0", "lon": "2.0"}])
    )
    create = client.post(
        "/properties", json={"name": "Building", "address": "1 First St"}, headers=headers
    )
    property_id = create.json()["id"]
    assert create.json()["latitude"] == 1.0

    # Address changes, but this time geocoding fails -- the old coordinates
    # must not be left pointing at the old address.
    respx.get(NOMINATIM_URL).mock(side_effect=httpx.ConnectTimeout("timed out"))
    update = client.patch(
        f"/properties/{property_id}", json={"address": "2 Second St"}, headers=headers
    )
    assert update.status_code == 200
    assert update.json()["latitude"] is None
    assert update.json()["longitude"] is None


def test_geocoding_disabled_by_default_in_tests(client, landlord_token):
    """No monkeypatch here -- confirms the conftest.py default (off) holds,
    so the rest of the suite's POST /properties calls never hit the network."""
    resp = client.post(
        "/properties",
        json={"name": "Default Building", "address": "Addr"},
        headers=landlord_token(),
    )
    assert resp.status_code == 201
    assert resp.json()["latitude"] is None
    assert resp.json()["longitude"] is None
