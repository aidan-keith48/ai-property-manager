def test_create_get_update_delete_tenant(client, landlord_token):
    headers = landlord_token()

    create = client.post(
        "/tenants",
        json={"name": "Jane Tenant", "email": "jane@example.com", "phone": "0821234567"},
        headers=headers,
    )
    assert create.status_code == 201
    tenant_id = create.json()["id"]
    assert create.json()["unit_id"] is None

    get_resp = client.get(f"/tenants/{tenant_id}", headers=headers)
    assert get_resp.status_code == 200

    update = client.patch(f"/tenants/{tenant_id}", json={"phone": "0829999999"}, headers=headers)
    assert update.status_code == 200
    assert update.json()["phone"] == "0829999999"

    delete = client.delete(f"/tenants/{tenant_id}", headers=headers)
    assert delete.status_code == 204


def test_duplicate_tenant_email_rejected(client, landlord_token):
    headers = landlord_token()
    payload = {"name": "Dup Tenant", "email": "dup-tenant@example.com"}
    first = client.post("/tenants", json=payload, headers=headers)
    assert first.status_code == 201

    second = client.post("/tenants", json=payload, headers=headers)
    assert second.status_code == 409


def test_tenant_update_cannot_set_unit_id(client, landlord_token):
    """unit_id is intentionally not part of TenantUpdate's schema — passing it
    must be silently ignored (extra field), never applied. Only the lease
    create/end code path may change tenant.unit_id."""
    headers = landlord_token()
    create = client.post(
        "/tenants", json={"name": "T", "email": "unit-guard@example.com"}, headers=headers
    )
    tenant_id = create.json()["id"]

    update = client.patch(f"/tenants/{tenant_id}", json={"unit_id": 999}, headers=headers)
    assert update.status_code == 200
    assert update.json()["unit_id"] is None
