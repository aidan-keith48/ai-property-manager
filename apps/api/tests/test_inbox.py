from app.models import ActorType, AuditLog


def _make_tenant_with_submission(client, landlord_headers, email: str, description: str) -> dict:
    property_resp = client.post(
        "/properties", json={"name": "Inbox Building", "address": "Addr"}, headers=landlord_headers
    )
    unit_resp = client.post(
        f"/properties/{property_resp.json()['id']}/units",
        json={"unit_label": "1A"},
        headers=landlord_headers,
    )
    tenant_resp = client.post(
        "/tenants", json={"name": "Inbox Tenant", "email": email}, headers=landlord_headers
    )
    tenant_id = tenant_resp.json()["id"]
    client.post(
        "/leases",
        json={
            "unit_id": unit_resp.json()["id"],
            "tenant_id": tenant_id,
            "start_date": "2026-01-01",
            "rent_amount": 9500.00,
        },
        headers=landlord_headers,
    )

    request = client.post("/auth/tenant/magic-link/request", json={"email": email})
    verify = client.post(
        "/auth/tenant/magic-link/verify", json={"token": request.json()["debug_token"]}
    )
    tenant_headers = {"Authorization": f"Bearer {verify.json()['access_token']}"}

    submission = client.post(
        "/submissions", data={"description": description}, headers=tenant_headers
    )

    return {
        "property_id": property_resp.json()["id"],
        "unit_id": unit_resp.json()["id"],
        "tenant_id": tenant_id,
        "tenant_headers": tenant_headers,
        "submission_id": submission.json()["id"],
    }


def test_inbox_lists_submission_with_context_and_ack_message(client, landlord_token):
    headers = landlord_token()
    ctx = _make_tenant_with_submission(client, headers, "inbox-1@example.com", "Leaking tap")

    resp = client.get("/inbox", headers=headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    item = items[0]
    assert item["id"] == ctx["submission_id"]
    assert item["tenant_name"] == "Inbox Tenant"
    assert item["unit_label"] == "1A"
    assert item["property_name"] == "Inbox Building"
    assert item["message_count"] == 1  # the automatic acknowledgment


def test_inbox_filters_by_property_and_tenant(client, landlord_token):
    headers = landlord_token()
    ctx_a = _make_tenant_with_submission(client, headers, "inbox-2a@example.com", "Issue A")
    ctx_b = _make_tenant_with_submission(client, headers, "inbox-2b@example.com", "Issue B")

    by_tenant = client.get(f"/inbox?tenant_id={ctx_a['tenant_id']}", headers=headers)
    assert by_tenant.status_code == 200
    ids = [i["id"] for i in by_tenant.json()]
    assert ctx_a["submission_id"] in ids
    assert ctx_b["submission_id"] not in ids

    by_property = client.get(f"/inbox?property_id={ctx_b['property_id']}", headers=headers)
    ids = [i["id"] for i in by_property.json()]
    assert ctx_b["submission_id"] in ids
    assert ctx_a["submission_id"] not in ids


def test_inbox_scoped_to_owning_landlord(client, landlord_token):
    headers_a = landlord_token("inbox-owner-a@example.com")
    headers_b = landlord_token("inbox-owner-b@example.com")
    _make_tenant_with_submission(client, headers_a, "inbox-3@example.com", "Issue")

    resp = client.get("/inbox", headers=headers_b)
    assert resp.status_code == 200
    assert resp.json() == []


def test_inbox_thread_shows_ack_message(client, landlord_token):
    headers = landlord_token()
    ctx = _make_tenant_with_submission(client, headers, "inbox-4@example.com", "Broken heater")

    resp = client.get(f"/inbox/{ctx['submission_id']}", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["tenant_name"] == "Inbox Tenant"
    assert len(body["messages"]) == 1
    assert "received your submission" in body["messages"][0]["content"]


def test_landlord_reply_appears_in_thread_and_is_audit_logged(client, landlord_token, db_session):
    headers = landlord_token()
    ctx = _make_tenant_with_submission(client, headers, "inbox-5@example.com", "No water")

    reply = client.post(
        f"/inbox/{ctx['submission_id']}/messages",
        json={"content": "A plumber will be there tomorrow at 9am."},
        headers=headers,
    )
    assert reply.status_code == 201

    thread = client.get(f"/inbox/{ctx['submission_id']}", headers=headers)
    contents = [m["content"] for m in thread.json()["messages"]]
    assert "A plumber will be there tomorrow at 9am." in contents

    audit = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "inbox.reply", AuditLog.entity_id == ctx["submission_id"])
        .first()
    )
    assert audit is not None
    assert audit.actor_type == ActorType.LANDLORD


def test_tenant_sees_landlord_reply_in_own_thread(client, landlord_token):
    headers = landlord_token()
    ctx = _make_tenant_with_submission(client, headers, "inbox-6@example.com", "Pest issue")
    client.post(
        f"/inbox/{ctx['submission_id']}/messages",
        json={"content": "Pest control booked for Friday."},
        headers=headers,
    )

    resp = client.get(
        f"/submissions/{ctx['submission_id']}/messages", headers=ctx["tenant_headers"]
    )
    assert resp.status_code == 200
    contents = [m["content"] for m in resp.json()]
    assert "Pest control booked for Friday." in contents


def test_tenant_cannot_reply_via_inbox_endpoint(client, landlord_token):
    headers = landlord_token()
    ctx = _make_tenant_with_submission(client, headers, "inbox-7@example.com", "Issue")

    resp = client.post(
        f"/inbox/{ctx['submission_id']}/messages",
        json={"content": "trying to reply"},
        headers=ctx["tenant_headers"],
    )
    assert resp.status_code in (401, 403)


def test_landlord_cannot_view_or_reply_to_unowned_submission(client, landlord_token):
    headers_a = landlord_token("inbox-owner-c@example.com")
    headers_b = landlord_token("inbox-owner-d@example.com")
    ctx = _make_tenant_with_submission(client, headers_a, "inbox-8@example.com", "Issue")

    get_resp = client.get(f"/inbox/{ctx['submission_id']}", headers=headers_b)
    assert get_resp.status_code == 404

    reply_resp = client.post(
        f"/inbox/{ctx['submission_id']}/messages", json={"content": "x"}, headers=headers_b
    )
    assert reply_resp.status_code == 404
