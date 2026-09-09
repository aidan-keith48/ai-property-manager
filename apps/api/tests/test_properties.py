def test_create_and_list_properties(client, landlord_token):
    headers = landlord_token()

    create = client.post(
        "/properties", json={"name": "Sea Point Block", "address": "1 Beach Rd"}, headers=headers
    )
    assert create.status_code == 201
    property_id = create.json()["id"]

    listing = client.get("/properties", headers=headers)
    assert listing.status_code == 200
    assert any(p["id"] == property_id for p in listing.json())


def test_update_and_delete_property(client, landlord_token):
    headers = landlord_token()
    create = client.post(
        "/properties", json={"name": "Old Name", "address": "Addr"}, headers=headers
    )
    property_id = create.json()["id"]

    update = client.patch(
        f"/properties/{property_id}", json={"name": "New Name"}, headers=headers
    )
    assert update.status_code == 200
    assert update.json()["name"] == "New Name"

    delete = client.delete(f"/properties/{property_id}", headers=headers)
    assert delete.status_code == 204

    get_after_delete = client.get(f"/properties/{property_id}", headers=headers)
    assert get_after_delete.status_code == 404


def test_landlord_cannot_access_another_landlords_property(client, landlord_token):
    headers_a = landlord_token("owner-a@example.com")
    headers_b = landlord_token("owner-b@example.com")

    create = client.post(
        "/properties", json={"name": "A's Building", "address": "Addr"}, headers=headers_a
    )
    property_id = create.json()["id"]

    resp = client.get(f"/properties/{property_id}", headers=headers_b)
    assert resp.status_code == 404


def test_properties_require_auth(client):
    resp = client.get("/properties")
    assert resp.status_code in (401, 403)
