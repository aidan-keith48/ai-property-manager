import io

from app.models import ActorType, AuditLog, CommunicationLog


def _make_tenant_with_lease(client, landlord_headers, email: str) -> str:
    """Creates a tenant with an active lease, then returns tenant auth headers."""
    property_resp = client.post(
        "/properties", json={"name": "Sub Building", "address": "Addr"}, headers=landlord_headers
    )
    unit_resp = client.post(
        f"/properties/{property_resp.json()['id']}/units",
        json={"unit_label": "1A"},
        headers=landlord_headers,
    )
    tenant_resp = client.post(
        "/tenants", json={"name": "Sub Tenant", "email": email}, headers=landlord_headers
    )
    tenant_id = tenant_resp.json()["id"]
    client.post(
        "/leases",
        json={
            "unit_id": unit_resp.json()["id"],
            "tenant_id": tenant_id,
            "start_date": "2026-01-01",
            "rent_amount": 9000.00,
        },
        headers=landlord_headers,
    )

    request = client.post("/auth/tenant/magic-link/request", json={"email": email})
    verify = client.post(
        "/auth/tenant/magic-link/verify", json={"token": request.json()["debug_token"]}
    )
    return {"Authorization": f"Bearer {verify.json()['access_token']}"}


def test_tenant_can_create_text_only_submission(client, landlord_token):
    headers = landlord_token()
    tenant_headers = _make_tenant_with_lease(client, headers, "sub-tenant-1@example.com")

    resp = client.post(
        "/submissions",
        data={"description": "Leaking tap in the kitchen"},
        headers=tenant_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["description"] == "Leaking tap in the kitchen"
    assert body["photo_paths"] == []
    assert body["status"] == "open"


def test_tenant_can_create_submission_with_photo(client, landlord_token):
    headers = landlord_token()
    tenant_headers = _make_tenant_with_lease(client, headers, "sub-tenant-2@example.com")

    resp = client.post(
        "/submissions",
        data={"description": "Broken window"},
        files={"photos": ("window.jpg", io.BytesIO(b"fake-image-bytes"), "image/jpeg")},
        headers=tenant_headers,
    )
    assert resp.status_code == 201
    assert len(resp.json()["photo_paths"]) == 1


def test_submission_triggers_acknowledgment_and_audit_log(client, landlord_token, db_session):
    headers = landlord_token()
    tenant_headers = _make_tenant_with_lease(client, headers, "sub-tenant-3@example.com")

    resp = client.post(
        "/submissions", data={"description": "No hot water"}, headers=tenant_headers
    )
    submission_id = resp.json()["id"]

    ack = (
        db_session.query(CommunicationLog)
        .filter(
            CommunicationLog.related_entity_type == "submission",
            CommunicationLog.related_entity_id == submission_id,
        )
        .first()
    )
    assert ack is not None
    assert ack.direction == "outbound"

    audit = (
        db_session.query(AuditLog)
        .filter(
            AuditLog.entity_type == "submission",
            AuditLog.entity_id == submission_id,
            AuditLog.action == "submission.create",
        )
        .first()
    )
    assert audit is not None
    assert audit.actor_type == ActorType.TENANT


def test_tenant_without_unit_cannot_submit(client, landlord_token, db_session):
    headers = landlord_token()
    client.post(
        "/tenants",
        json={"name": "Unassigned Tenant", "email": "unassigned@example.com"},
        headers=headers,
    )
    request = client.post(
        "/auth/tenant/magic-link/request", json={"email": "unassigned@example.com"}
    )
    verify = client.post(
        "/auth/tenant/magic-link/verify", json={"token": request.json()["debug_token"]}
    )
    tenant_headers = {"Authorization": f"Bearer {verify.json()['access_token']}"}

    resp = client.post(
        "/submissions", data={"description": "Something broke"}, headers=tenant_headers
    )
    assert resp.status_code == 409


def test_landlord_cannot_create_submission(client, landlord_token):
    headers = landlord_token()
    resp = client.post("/submissions", data={"description": "test"}, headers=headers)
    assert resp.status_code in (401, 403)


def test_tenant_can_view_own_submission_but_not_others(client, landlord_token):
    headers = landlord_token()
    tenant_a_headers = _make_tenant_with_lease(client, headers, "sub-tenant-a@example.com")
    tenant_b_headers = _make_tenant_with_lease(client, headers, "sub-tenant-b@example.com")

    resp = client.post(
        "/submissions", data={"description": "Tenant A's issue"}, headers=tenant_a_headers
    )
    submission_id = resp.json()["id"]

    own = client.get(f"/submissions/{submission_id}", headers=tenant_a_headers)
    assert own.status_code == 200

    other = client.get(f"/submissions/{submission_id}", headers=tenant_b_headers)
    assert other.status_code == 404


def test_photo_viewable_by_owning_tenant_and_landlord(client, landlord_token):
    headers = landlord_token()
    tenant_headers = _make_tenant_with_lease(client, headers, "sub-tenant-photo@example.com")

    resp = client.post(
        "/submissions",
        data={"description": "Cracked window"},
        files={"photos": ("crack.jpg", io.BytesIO(b"fake-jpeg-bytes"), "image/jpeg")},
        headers=tenant_headers,
    )
    submission_id = resp.json()["id"]

    tenant_view = client.get(f"/submissions/{submission_id}/photos/0", headers=tenant_headers)
    assert tenant_view.status_code == 200
    assert tenant_view.content == b"fake-jpeg-bytes"
    assert tenant_view.headers["content-type"] == "image/jpeg"

    landlord_view = client.get(f"/submissions/{submission_id}/photos/0", headers=headers)
    assert landlord_view.status_code == 200
    assert landlord_view.content == b"fake-jpeg-bytes"


def test_photo_not_viewable_by_unrelated_tenant(client, landlord_token):
    headers = landlord_token()
    tenant_a_headers = _make_tenant_with_lease(client, headers, "sub-tenant-photo-a@example.com")
    tenant_b_headers = _make_tenant_with_lease(client, headers, "sub-tenant-photo-b@example.com")

    resp = client.post(
        "/submissions",
        data={"description": "Issue"},
        files={"photos": ("photo.jpg", io.BytesIO(b"bytes"), "image/jpeg")},
        headers=tenant_a_headers,
    )
    submission_id = resp.json()["id"]

    other = client.get(f"/submissions/{submission_id}/photos/0", headers=tenant_b_headers)
    assert other.status_code == 403


def test_photo_index_out_of_range_returns_404(client, landlord_token):
    headers = landlord_token()
    tenant_headers = _make_tenant_with_lease(client, headers, "sub-tenant-noindex@example.com")

    resp = client.post(
        "/submissions", data={"description": "No photos here"}, headers=tenant_headers
    )
    submission_id = resp.json()["id"]

    missing = client.get(f"/submissions/{submission_id}/photos/0", headers=tenant_headers)
    assert missing.status_code == 404
