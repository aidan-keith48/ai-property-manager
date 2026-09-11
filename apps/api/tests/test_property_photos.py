import io

from app.config import settings


def _make_property(client, headers, name: str = "Photo Building") -> int:
    resp = client.post("/properties", json={"name": name, "address": "Addr"}, headers=headers)
    return resp.json()["id"]


def test_landlord_can_upload_list_and_fetch_photo(client, landlord_token):
    headers = landlord_token()
    property_id = _make_property(client, headers)

    upload = client.post(
        f"/properties/{property_id}/photos",
        files={"file": ("front.jpg", io.BytesIO(b"fake-jpeg-bytes"), "image/jpeg")},
        headers=headers,
    )
    assert upload.status_code == 201
    photo_id = upload.json()["id"]
    assert upload.json()["property_id"] == property_id

    listing = client.get(f"/properties/{property_id}/photos", headers=headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    fetched = client.get(f"/properties/{property_id}/photos/{photo_id}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.content == b"fake-jpeg-bytes"


def test_property_list_and_detail_expose_first_photo_id(client, landlord_token):
    headers = landlord_token()
    property_id = _make_property(client, headers)

    before = client.get(f"/properties/{property_id}", headers=headers)
    assert before.json()["first_photo_id"] is None

    upload = client.post(
        f"/properties/{property_id}/photos",
        files={"file": ("front.jpg", io.BytesIO(b"bytes"), "image/jpeg")},
        headers=headers,
    )
    photo_id = upload.json()["id"]

    detail = client.get(f"/properties/{property_id}", headers=headers)
    assert detail.json()["first_photo_id"] == photo_id

    listing = client.get("/properties", headers=headers)
    listed = next(p for p in listing.json() if p["id"] == property_id)
    assert listed["first_photo_id"] == photo_id


def test_another_landlords_property_photos_are_404(client, landlord_token):
    headers_a = landlord_token("photo-owner-a@example.com")
    headers_b = landlord_token("photo-owner-b@example.com")
    property_id = _make_property(client, headers_a)

    upload = client.post(
        f"/properties/{property_id}/photos",
        files={"file": ("front.jpg", io.BytesIO(b"bytes"), "image/jpeg")},
        headers=headers_a,
    )
    photo_id = upload.json()["id"]

    assert client.post(
        f"/properties/{property_id}/photos",
        files={"file": ("x.jpg", io.BytesIO(b"bytes"), "image/jpeg")},
        headers=headers_b,
    ).status_code == 404
    assert client.get(f"/properties/{property_id}/photos", headers=headers_b).status_code == 404
    assert (
        client.get(f"/properties/{property_id}/photos/{photo_id}", headers=headers_b).status_code
        == 404
    )
    assert (
        client.delete(f"/properties/{property_id}/photos/{photo_id}", headers=headers_b).status_code
        == 404
    )


def test_deleting_photo_removes_it(client, landlord_token):
    headers = landlord_token()
    property_id = _make_property(client, headers)

    upload = client.post(
        f"/properties/{property_id}/photos",
        files={"file": ("front.jpg", io.BytesIO(b"bytes"), "image/jpeg")},
        headers=headers,
    )
    photo_id = upload.json()["id"]

    delete = client.delete(f"/properties/{property_id}/photos/{photo_id}", headers=headers)
    assert delete.status_code == 204

    fetched = client.get(f"/properties/{property_id}/photos/{photo_id}", headers=headers)
    assert fetched.status_code == 404

    listing = client.get(f"/properties/{property_id}/photos", headers=headers)
    assert listing.json() == []


def test_oversized_property_photo_is_rejected(client, landlord_token):
    headers = landlord_token()
    property_id = _make_property(client, headers)

    oversized = io.BytesIO(b"x" * (settings.upload_max_bytes + 1))
    resp = client.post(
        f"/properties/{property_id}/photos",
        files={"file": ("huge.jpg", oversized, "image/jpeg")},
        headers=headers,
    )
    assert resp.status_code == 413


def test_disallowed_content_type_property_photo_is_rejected(client, landlord_token):
    headers = landlord_token()
    property_id = _make_property(client, headers)

    resp = client.post(
        f"/properties/{property_id}/photos",
        files={"file": ("doc.pdf", io.BytesIO(b"%PDF-fake"), "application/pdf")},
        headers=headers,
    )
    assert resp.status_code == 415
