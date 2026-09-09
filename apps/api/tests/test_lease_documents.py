import io

from app.models import Tenant


def _make_lease(client, headers) -> tuple[int, int]:
    property_resp = client.post(
        "/properties", json={"name": "Doc Building", "address": "Addr"}, headers=headers
    )
    unit_resp = client.post(
        f"/properties/{property_resp.json()['id']}/units",
        json={"unit_label": "1A"},
        headers=headers,
    )
    tenant_resp = client.post(
        "/tenants", json={"name": "Doc Tenant", "email": "doc-tenant@example.com"}, headers=headers
    )
    tenant_id = tenant_resp.json()["id"]

    lease_resp = client.post(
        "/leases",
        json={
            "unit_id": unit_resp.json()["id"],
            "tenant_id": tenant_id,
            "start_date": "2026-01-01",
            "rent_amount": 9000.00,
        },
        headers=headers,
    )
    return lease_resp.json()["id"], tenant_id


def test_landlord_can_upload_and_download_document(client, landlord_token):
    headers = landlord_token()
    lease_id, _ = _make_lease(client, headers)

    upload = client.post(
        f"/leases/{lease_id}/documents",
        files={"file": ("lease.pdf", io.BytesIO(b"%PDF-fake-content"), "application/pdf")},
        headers=headers,
    )
    assert upload.status_code == 201
    document_id = upload.json()["id"]

    download = client.get(f"/leases/{lease_id}/documents/{document_id}/download", headers=headers)
    assert download.status_code == 200
    assert download.content == b"%PDF-fake-content"


def test_tenant_can_download_own_lease_document(client, landlord_token, db_session):
    headers = landlord_token()
    lease_id, tenant_id = _make_lease(client, headers)

    upload = client.post(
        f"/leases/{lease_id}/documents",
        files={"file": ("id.pdf", io.BytesIO(b"id-doc-bytes"), "application/pdf")},
        headers=headers,
    )
    document_id = upload.json()["id"]

    tenant = db_session.get(Tenant, tenant_id)
    request = client.post(
        "/auth/tenant/magic-link/request", json={"email": tenant.email}
    )
    verify = client.post(
        "/auth/tenant/magic-link/verify", json={"token": request.json()["debug_token"]}
    )
    tenant_headers = {"Authorization": f"Bearer {verify.json()['access_token']}"}

    download = client.get(
        f"/leases/{lease_id}/documents/{document_id}/download", headers=tenant_headers
    )
    assert download.status_code == 200


def test_unrelated_tenant_cannot_download_lease_document(client, landlord_token, db_session):
    headers = landlord_token()
    lease_id, _ = _make_lease(client, headers)
    upload = client.post(
        f"/leases/{lease_id}/documents",
        files={"file": ("id.pdf", io.BytesIO(b"id-doc-bytes"), "application/pdf")},
        headers=headers,
    )
    document_id = upload.json()["id"]

    other_tenant = Tenant(name="Other Tenant", email="other-tenant@example.com")
    db_session.add(other_tenant)
    db_session.commit()

    request = client.post(
        "/auth/tenant/magic-link/request", json={"email": "other-tenant@example.com"}
    )
    verify = client.post(
        "/auth/tenant/magic-link/verify", json={"token": request.json()["debug_token"]}
    )
    other_tenant_headers = {"Authorization": f"Bearer {verify.json()['access_token']}"}

    download = client.get(
        f"/leases/{lease_id}/documents/{document_id}/download", headers=other_tenant_headers
    )
    assert download.status_code == 403


def test_tenant_cannot_upload_lease_document(client, landlord_token, db_session):
    headers = landlord_token()
    lease_id, tenant_id = _make_lease(client, headers)

    tenant = db_session.get(Tenant, tenant_id)
    request = client.post("/auth/tenant/magic-link/request", json={"email": tenant.email})
    verify = client.post(
        "/auth/tenant/magic-link/verify", json={"token": request.json()["debug_token"]}
    )
    tenant_headers = {"Authorization": f"Bearer {verify.json()['access_token']}"}

    upload = client.post(
        f"/leases/{lease_id}/documents",
        files={"file": ("id.pdf", io.BytesIO(b"data"), "application/pdf")},
        headers=tenant_headers,
    )
    assert upload.status_code == 403
