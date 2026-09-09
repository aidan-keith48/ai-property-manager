def test_property_activity_includes_property_and_unit_events(client, landlord_token):
    headers = landlord_token()

    property_resp = client.post(
        "/properties", json={"name": "Activity Building", "address": "Addr"}, headers=headers
    )
    property_id = property_resp.json()["id"]

    unit_resp = client.post(
        f"/properties/{property_id}/units", json={"unit_label": "1A"}, headers=headers
    )
    unit_id = unit_resp.json()["id"]

    client.patch(f"/properties/{property_id}", json={"name": "Renamed Building"}, headers=headers)

    activity = client.get(f"/properties/{property_id}/activity", headers=headers)
    assert activity.status_code == 200
    actions = [a["action"] for a in activity.json()]
    assert "property.create" in actions
    assert "property.update" in actions
    assert "unit.create" in actions

    # Sanity: entries are actually tagged to this property, not just present
    for entry in activity.json():
        assert entry["log_metadata"]["property_id"] == property_id

    # And unit-scoped activity only shows the unit's own events, a subset
    unit_activity = client.get(f"/units/{unit_id}/activity", headers=headers)
    assert unit_activity.status_code == 200
    unit_actions = [a["action"] for a in unit_activity.json()]
    assert "unit.create" in unit_actions
    assert "property.create" not in unit_actions


def test_activity_includes_lease_and_submission_events(client, landlord_token):
    headers = landlord_token()
    property_resp = client.post(
        "/properties", json={"name": "Activity Building 2", "address": "Addr"}, headers=headers
    )
    property_id = property_resp.json()["id"]
    unit_resp = client.post(
        f"/properties/{property_id}/units", json={"unit_label": "2B"}, headers=headers
    )
    unit_id = unit_resp.json()["id"]
    tenant_resp = client.post(
        "/tenants",
        json={"name": "Activity Tenant", "email": "activity-tenant@example.com"},
        headers=headers,
    )
    tenant_id = tenant_resp.json()["id"]

    lease_resp = client.post(
        "/leases",
        json={
            "unit_id": unit_id,
            "tenant_id": tenant_id,
            "start_date": "2026-01-01",
            "rent_amount": 8000.00,
        },
        headers=headers,
    )
    lease_id = lease_resp.json()["id"]

    request = client.post(
        "/auth/tenant/magic-link/request", json={"email": "activity-tenant@example.com"}
    )
    verify = client.post(
        "/auth/tenant/magic-link/verify", json={"token": request.json()["debug_token"]}
    )
    tenant_headers = {"Authorization": f"Bearer {verify.json()['access_token']}"}

    client.post(
        "/submissions", data={"description": "Something broke"}, headers=tenant_headers
    )
    client.post(f"/leases/{lease_id}/end", json={}, headers=headers)

    activity = client.get(f"/units/{unit_id}/activity", headers=headers)
    actions = [a["action"] for a in activity.json()]
    assert "lease.create" in actions
    assert "lease.end" in actions
    assert "submission.create" in actions

    property_activity = client.get(f"/properties/{property_id}/activity", headers=headers)
    property_actions = [a["action"] for a in property_activity.json()]
    assert "lease.create" in property_actions
    assert "submission.create" in property_actions


def test_activity_scoped_to_owning_landlord(client, landlord_token):
    headers_a = landlord_token("activity-owner-a@example.com")
    headers_b = landlord_token("activity-owner-b@example.com")

    property_resp = client.post(
        "/properties", json={"name": "A's Building", "address": "Addr"}, headers=headers_a
    )
    property_id = property_resp.json()["id"]

    resp = client.get(f"/properties/{property_id}/activity", headers=headers_b)
    assert resp.status_code == 404


def test_lease_document_events_appear_in_unit_activity(client, landlord_token):
    import io

    headers = landlord_token()
    property_resp = client.post(
        "/properties", json={"name": "Doc Activity Building", "address": "Addr"}, headers=headers
    )
    unit_resp = client.post(
        f"/properties/{property_resp.json()['id']}/units",
        json={"unit_label": "3C"},
        headers=headers,
    )
    unit_id = unit_resp.json()["id"]
    tenant_resp = client.post(
        "/tenants",
        json={"name": "Doc Activity Tenant", "email": "doc-activity-tenant@example.com"},
        headers=headers,
    )
    lease_resp = client.post(
        "/leases",
        json={
            "unit_id": unit_id,
            "tenant_id": tenant_resp.json()["id"],
            "start_date": "2026-01-01",
            "rent_amount": 7500.00,
        },
        headers=headers,
    )
    lease_id = lease_resp.json()["id"]

    client.post(
        f"/leases/{lease_id}/documents",
        files={"file": ("lease.pdf", io.BytesIO(b"pdf-bytes"), "application/pdf")},
        headers=headers,
    )

    activity = client.get(f"/units/{unit_id}/activity", headers=headers)
    actions = [a["action"] for a in activity.json()]
    assert "lease_document.upload" in actions
