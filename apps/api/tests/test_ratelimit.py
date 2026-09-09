def test_magic_link_request_rate_limited_after_threshold(client, landlord_token):
    headers = landlord_token()
    client.post(
        "/tenants",
        json={"name": "Rate Limit Tenant", "email": "ratelimit-tenant@example.com"},
        headers=headers,
    )

    # Limit is 5 per 15 minutes (app/routers/auth.py).
    for _ in range(5):
        resp = client.post(
            "/auth/tenant/magic-link/request", json={"email": "ratelimit-tenant@example.com"}
        )
        assert resp.status_code == 200

    sixth = client.post(
        "/auth/tenant/magic-link/request", json={"email": "ratelimit-tenant@example.com"}
    )
    assert sixth.status_code == 429


def test_magic_link_verify_rate_limited_after_threshold(client):
    # Limit is 10 per 15 minutes (app/routers/auth.py). Wrong tokens are
    # fine for exercising the limiter — it counts requests, not successes.
    for _ in range(10):
        resp = client.post("/auth/tenant/magic-link/verify", json={"token": "not-a-real-token"})
        assert resp.status_code == 401

    eleventh = client.post(
        "/auth/tenant/magic-link/verify", json={"token": "not-a-real-token"}
    )
    assert eleventh.status_code == 429


def test_submission_create_rate_limited_after_threshold(client, landlord_token):
    headers = landlord_token()
    property_resp = client.post(
        "/properties", json={"name": "RL Building", "address": "Addr"}, headers=headers
    )
    unit_resp = client.post(
        f"/properties/{property_resp.json()['id']}/units",
        json={"unit_label": "1A"},
        headers=headers,
    )
    tenant_resp = client.post(
        "/tenants", json={"name": "RL Tenant", "email": "rl-submission-tenant@example.com"},
        headers=headers,
    )
    client.post(
        "/leases",
        json={
            "unit_id": unit_resp.json()["id"],
            "tenant_id": tenant_resp.json()["id"],
            "start_date": "2026-01-01",
            "rent_amount": 5000.00,
        },
        headers=headers,
    )
    request = client.post(
        "/auth/tenant/magic-link/request", json={"email": "rl-submission-tenant@example.com"}
    )
    verify = client.post(
        "/auth/tenant/magic-link/verify", json={"token": request.json()["debug_token"]}
    )
    tenant_headers = {"Authorization": f"Bearer {verify.json()['access_token']}"}

    # Limit is 20 per hour (app/routers/submissions.py).
    for _ in range(20):
        resp = client.post(
            "/submissions", data={"description": "issue"}, headers=tenant_headers
        )
        assert resp.status_code == 201

    over_limit = client.post(
        "/submissions", data={"description": "one too many"}, headers=tenant_headers
    )
    assert over_limit.status_code == 429


def test_rate_limits_tracked_independently_per_ip():
    """The TestClient always reports the same fake IP, so this can't fully
    exercise per-IP isolation end-to-end — instead it verifies the
    dependency factory itself keys on client_ip, which is what makes
    per-IP isolation true in a real deployment."""
    from types import SimpleNamespace

    from app.ratelimit import get_redis, rate_limit

    limiter = rate_limit("isolation_test", max_requests=2, window_seconds=60)
    redis_client = get_redis()
    for key in redis_client.scan_iter("ratelimit:isolation_test:*"):
        redis_client.delete(key)

    request_a = SimpleNamespace(client=SimpleNamespace(host="1.1.1.1"))
    request_b = SimpleNamespace(client=SimpleNamespace(host="2.2.2.2"))

    limiter(request_a)
    limiter(request_a)
    limiter(request_b)  # different IP — its own counter, not blocked by A's usage
