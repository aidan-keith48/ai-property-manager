def _make_property_and_unit(client, headers) -> tuple[int, int]:
    property_resp = client.post(
        "/properties", json={"name": "Building", "address": "Addr"}, headers=headers
    )
    property_id = property_resp.json()["id"]
    unit_resp = client.post(
        f"/properties/{property_id}/units", json={"unit_label": "1A"}, headers=headers
    )
    return property_id, unit_resp.json()["id"]


def _make_tenant(client, headers, email: str = "lease-tenant@example.com") -> int:
    resp = client.post("/tenants", json={"name": "Lease Tenant", "email": email}, headers=headers)
    return resp.json()["id"]


def test_creating_lease_sets_tenant_unit_id(client, landlord_token):
    """The core confirmed decision: tenant.unit_id is only ever set as a side
    effect of lease creation, inside the same transaction — never editable
    directly (see test_tenants.py::test_tenant_update_cannot_set_unit_id)."""
    headers = landlord_token()
    _, unit_id = _make_property_and_unit(client, headers)
    tenant_id = _make_tenant(client, headers)

    lease = client.post(
        "/leases",
        json={
            "unit_id": unit_id,
            "tenant_id": tenant_id,
            "start_date": "2026-01-01",
            "rent_amount": 12000.00,
        },
        headers=headers,
    )
    assert lease.status_code == 201
    assert lease.json()["status"] == "active"

    tenant = client.get(f"/tenants/{tenant_id}", headers=headers)
    assert tenant.json()["unit_id"] == unit_id


def test_ending_lease_clears_tenant_unit_id(client, landlord_token):
    headers = landlord_token()
    _, unit_id = _make_property_and_unit(client, headers)
    tenant_id = _make_tenant(client, headers, "end-lease-tenant@example.com")

    lease = client.post(
        "/leases",
        json={
            "unit_id": unit_id,
            "tenant_id": tenant_id,
            "start_date": "2026-01-01",
            "rent_amount": 12000.00,
        },
        headers=headers,
    )
    lease_id = lease.json()["id"]

    ended = client.post(f"/leases/{lease_id}/end", json={}, headers=headers)
    assert ended.status_code == 200
    assert ended.json()["status"] == "ended"

    tenant = client.get(f"/tenants/{tenant_id}", headers=headers)
    assert tenant.json()["unit_id"] is None


def test_tenant_with_active_lease_cannot_get_second_lease(client, landlord_token):
    headers = landlord_token()
    _, unit_a = _make_property_and_unit(client, headers)
    _, unit_b = _make_property_and_unit(client, headers)
    tenant_id = _make_tenant(client, headers, "double-lease-tenant@example.com")

    first = client.post(
        "/leases",
        json={
            "unit_id": unit_a,
            "tenant_id": tenant_id,
            "start_date": "2026-01-01",
            "rent_amount": 10000.00,
        },
        headers=headers,
    )
    assert first.status_code == 201

    second = client.post(
        "/leases",
        json={
            "unit_id": unit_b,
            "tenant_id": tenant_id,
            "start_date": "2026-01-01",
            "rent_amount": 10000.00,
        },
        headers=headers,
    )
    assert second.status_code == 409


def test_unit_with_active_lease_cannot_get_second_lease(client, landlord_token):
    headers = landlord_token()
    _, unit_id = _make_property_and_unit(client, headers)
    tenant_a = _make_tenant(client, headers, "unit-conflict-a@example.com")
    tenant_b = _make_tenant(client, headers, "unit-conflict-b@example.com")

    first = client.post(
        "/leases",
        json={
            "unit_id": unit_id,
            "tenant_id": tenant_a,
            "start_date": "2026-01-01",
            "rent_amount": 10000.00,
        },
        headers=headers,
    )
    assert first.status_code == 201

    second = client.post(
        "/leases",
        json={
            "unit_id": unit_id,
            "tenant_id": tenant_b,
            "start_date": "2026-01-01",
            "rent_amount": 10000.00,
        },
        headers=headers,
    )
    assert second.status_code == 409


def test_new_lease_allowed_after_previous_lease_ended(client, landlord_token):
    headers = landlord_token()
    _, unit_id = _make_property_and_unit(client, headers)
    tenant_a = _make_tenant(client, headers, "reuse-a@example.com")
    tenant_b = _make_tenant(client, headers, "reuse-b@example.com")

    first = client.post(
        "/leases",
        json={
            "unit_id": unit_id,
            "tenant_id": tenant_a,
            "start_date": "2026-01-01",
            "rent_amount": 10000.00,
        },
        headers=headers,
    )
    client.post(f"/leases/{first.json()['id']}/end", json={}, headers=headers)

    second = client.post(
        "/leases",
        json={
            "unit_id": unit_id,
            "tenant_id": tenant_b,
            "start_date": "2026-06-01",
            "rent_amount": 11000.00,
        },
        headers=headers,
    )
    assert second.status_code == 201


def test_lease_scoped_to_owning_landlord(client, landlord_token):
    headers_a = landlord_token("lease-owner-a@example.com")
    headers_b = landlord_token("lease-owner-b@example.com")
    _, unit_id = _make_property_and_unit(client, headers_a)
    tenant_id = _make_tenant(client, headers_a, "scoped-tenant@example.com")

    lease = client.post(
        "/leases",
        json={
            "unit_id": unit_id,
            "tenant_id": tenant_id,
            "start_date": "2026-01-01",
            "rent_amount": 10000.00,
        },
        headers=headers_a,
    )
    lease_id = lease.json()["id"]

    resp = client.get(f"/leases/{lease_id}", headers=headers_b)
    assert resp.status_code == 404
