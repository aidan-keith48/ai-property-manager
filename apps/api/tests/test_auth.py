from app.models import Tenant


def test_landlord_signup_and_login(client):
    signup = client.post(
        "/auth/landlord/signup",
        json={
            "email": "landlord@example.com",
            "password": "supersecret123",
            "name": "Landlord One",
        },
    )
    assert signup.status_code == 201
    assert "access_token" in signup.json()

    login = client.post(
        "/auth/landlord/login",
        json={"email": "landlord@example.com", "password": "supersecret123"},
    )
    assert login.status_code == 200
    assert "access_token" in login.json()


def test_landlord_signup_duplicate_email_rejected(client):
    payload = {"email": "dup@example.com", "password": "supersecret123", "name": "Landlord"}
    first = client.post("/auth/landlord/signup", json=payload)
    assert first.status_code == 201

    second = client.post("/auth/landlord/signup", json=payload)
    assert second.status_code == 409


def test_landlord_login_wrong_password_rejected(client):
    client.post(
        "/auth/landlord/signup",
        json={"email": "landlord2@example.com", "password": "supersecret123", "name": "Landlord"},
    )
    resp = client.post(
        "/auth/landlord/login",
        json={"email": "landlord2@example.com", "password": "wrong-password"},
    )
    assert resp.status_code == 401


def test_landlord_me_requires_token(client):
    resp = client.get("/auth/landlord/me")
    assert resp.status_code in (401, 403)


def test_landlord_me_with_valid_token(client):
    signup = client.post(
        "/auth/landlord/signup",
        json={
            "email": "landlord3@example.com",
            "password": "supersecret123",
            "name": "Landlord Three",
        },
    )
    token = signup.json()["access_token"]

    resp = client.get("/auth/landlord/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "landlord3@example.com"


def test_tenant_magic_link_request_and_verify(client, db_session):
    tenant = Tenant(name="Test Tenant", email="tenant@example.com")
    db_session.add(tenant)
    db_session.commit()

    request = client.post("/auth/tenant/magic-link/request", json={"email": "tenant@example.com"})
    assert request.status_code == 200
    raw_token = request.json()["debug_token"]
    assert raw_token is not None

    verify = client.post("/auth/tenant/magic-link/verify", json={"token": raw_token})
    assert verify.status_code == 200
    assert "access_token" in verify.json()

    # A used magic link cannot be replayed.
    replay = client.post("/auth/tenant/magic-link/verify", json={"token": raw_token})
    assert replay.status_code == 401


def test_magic_link_request_unknown_email_does_not_leak(client):
    resp = client.post("/auth/tenant/magic-link/request", json={"email": "nobody@example.com"})
    assert resp.status_code == 200
    assert resp.json()["debug_token"] is None


def test_tenant_cannot_access_landlord_me(client, db_session):
    tenant = Tenant(name="Cross Role Tenant", email="crossrole@example.com")
    db_session.add(tenant)
    db_session.commit()

    request = client.post(
        "/auth/tenant/magic-link/request", json={"email": "crossrole@example.com"}
    )
    verify = client.post(
        "/auth/tenant/magic-link/verify", json={"token": request.json()["debug_token"]}
    )
    tenant_token = verify.json()["access_token"]

    resp = client.get("/auth/landlord/me", headers={"Authorization": f"Bearer {tenant_token}"})
    assert resp.status_code == 403
