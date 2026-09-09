import os

# Point tests at a dedicated test database, never the dev database. Must be
# set before `app.config` (and anything importing it) is loaded.
os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://apm:apm_dev_password@localhost:5433/apm_test"
)
os.environ.setdefault("ENVIRONMENT", "test")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.config import settings  # noqa: E402
from app.db import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402
from app.ratelimit import get_redis  # noqa: E402
from app.storage import get_storage  # noqa: E402
from app.storage.local import LocalStorageBackend  # noqa: E402

engine = create_engine(settings.database_url)
TestSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(scope="session", autouse=True)
def _test_schema():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """Rate-limit counters live in Redis, outside the Postgres
    transaction-rollback isolation db_session gives each test — without
    this, tests would share counters via the TestClient's fixed fake IP
    and later tests would start failing with 429s depending on run order."""
    redis_client = get_redis()
    for key in redis_client.scan_iter("ratelimit:*"):
        redis_client.delete(key)
    yield


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session, tmp_path):
    def _get_db_override():
        yield db_session

    # Never write test uploads into the real local uploads/ folder.
    test_storage = LocalStorageBackend(str(tmp_path / "uploads"))

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_storage] = lambda: test_storage
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def landlord_token(client):
    """Signs up a fresh landlord and returns an Authorization header dict."""

    def _make(email: str = "crud-landlord@example.com") -> dict[str, str]:
        resp = client.post(
            "/auth/landlord/signup",
            json={"email": email, "password": "supersecret123", "name": "CRUD Landlord"},
        )
        assert resp.status_code == 201, resp.text
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _make
