def _make_property(client, headers) -> int:
    resp = client.post(
        "/properties", json={"name": "Building", "address": "Addr"}, headers=headers
    )
    return resp.json()["id"]


def test_create_and_list_units(client, landlord_token):
    headers = landlord_token()
    property_id = _make_property(client, headers)

    create = client.post(
        f"/properties/{property_id}/units",
        json={"unit_label": "Unit 1A", "bedrooms": 2, "bathrooms": 1},
        headers=headers,
    )
    assert create.status_code == 201
    unit_id = create.json()["id"]

    listing = client.get(f"/properties/{property_id}/units", headers=headers)
    assert listing.status_code == 200
    assert any(u["id"] == unit_id for u in listing.json())


def test_update_and_delete_unit(client, landlord_token):
    headers = landlord_token()
    property_id = _make_property(client, headers)
    create = client.post(
        f"/properties/{property_id}/units", json={"unit_label": "1A"}, headers=headers
    )
    unit_id = create.json()["id"]

    update = client.patch(f"/units/{unit_id}", json={"bedrooms": 3}, headers=headers)
    assert update.status_code == 200
    assert update.json()["bedrooms"] == 3

    delete = client.delete(f"/units/{unit_id}", headers=headers)
    assert delete.status_code == 204


def test_cannot_create_unit_under_another_landlords_property(client, landlord_token):
    headers_a = landlord_token("unit-owner-a@example.com")
    headers_b = landlord_token("unit-owner-b@example.com")
    property_id = _make_property(client, headers_a)

    resp = client.post(
        f"/properties/{property_id}/units", json={"unit_label": "1A"}, headers=headers_b
    )
    assert resp.status_code == 404
