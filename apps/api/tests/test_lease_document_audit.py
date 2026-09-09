import io

from app.models import ActorType, AuditLog


def _make_lease(client, headers) -> int:
    property_resp = client.post(
        "/properties", json={"name": "Audit Building", "address": "Addr"}, headers=headers
    )
    unit_resp = client.post(
        f"/properties/{property_resp.json()['id']}/units",
        json={"unit_label": "1A"},
        headers=headers,
    )
    tenant_resp = client.post(
        "/tenants",
        json={"name": "Audit Tenant", "email": "audit-tenant@example.com"},
        headers=headers,
    )
    lease_resp = client.post(
        "/leases",
        json={
            "unit_id": unit_resp.json()["id"],
            "tenant_id": tenant_resp.json()["id"],
            "start_date": "2026-01-01",
            "rent_amount": 8000.00,
        },
        headers=headers,
    )
    return lease_resp.json()["id"]


def test_upload_and_download_are_audit_logged(client, landlord_token, db_session):
    headers = landlord_token()
    lease_id = _make_lease(client, headers)

    upload = client.post(
        f"/leases/{lease_id}/documents",
        files={"file": ("id.pdf", io.BytesIO(b"id-bytes"), "application/pdf")},
        headers=headers,
    )
    document_id = upload.json()["id"]

    upload_logs = (
        db_session.query(AuditLog)
        .filter(
            AuditLog.entity_type == "lease_document",
            AuditLog.entity_id == document_id,
            AuditLog.action == "lease_document.upload",
        )
        .all()
    )
    assert len(upload_logs) == 1
    assert upload_logs[0].actor_type == ActorType.LANDLORD

    client.get(f"/leases/{lease_id}/documents/{document_id}/download", headers=headers)

    download_logs = (
        db_session.query(AuditLog)
        .filter(
            AuditLog.entity_type == "lease_document",
            AuditLog.entity_id == document_id,
            AuditLog.action == "lease_document.download",
        )
        .all()
    )
    assert len(download_logs) == 1


def test_delete_is_audit_logged_and_removes_document(client, landlord_token, db_session):
    headers = landlord_token()
    lease_id = _make_lease(client, headers)

    upload = client.post(
        f"/leases/{lease_id}/documents",
        files={"file": ("id.pdf", io.BytesIO(b"id-bytes"), "application/pdf")},
        headers=headers,
    )
    document_id = upload.json()["id"]

    delete = client.delete(f"/leases/{lease_id}/documents/{document_id}", headers=headers)
    assert delete.status_code == 204

    listing = client.get(f"/leases/{lease_id}/documents", headers=headers)
    assert all(doc["id"] != document_id for doc in listing.json())

    delete_logs = (
        db_session.query(AuditLog)
        .filter(
            AuditLog.entity_type == "lease_document",
            AuditLog.entity_id == document_id,
            AuditLog.action == "lease_document.delete",
        )
        .all()
    )
    assert len(delete_logs) == 1


def test_tenant_cannot_delete_lease_document(client, landlord_token, db_session):
    from app.models import Tenant

    headers = landlord_token()
    lease_id = _make_lease(client, headers)
    upload = client.post(
        f"/leases/{lease_id}/documents",
        files={"file": ("id.pdf", io.BytesIO(b"data"), "application/pdf")},
        headers=headers,
    )
    document_id = upload.json()["id"]

    tenant = db_session.query(Tenant).filter(Tenant.email == "audit-tenant@example.com").first()
    request = client.post("/auth/tenant/magic-link/request", json={"email": tenant.email})
    verify = client.post(
        "/auth/tenant/magic-link/verify", json={"token": request.json()["debug_token"]}
    )
    tenant_headers = {"Authorization": f"Bearer {verify.json()['access_token']}"}

    resp = client.delete(
        f"/leases/{lease_id}/documents/{document_id}", headers=tenant_headers
    )
    assert resp.status_code == 403
