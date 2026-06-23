import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db

# Setup temporary database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_db_override():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)

client = TestClient(app)

Base.metadata.create_all(bind=engine)

def test_security_headers_and_rate_limiting():
    # 1. Test presence of security headers
    response = client.get("/")
    assert response.status_code == 200
    headers = response.headers
    
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert "Strict-Transport-Security" in headers
    assert "Content-Security-Policy" in headers

    # 2. Test Rate Limiting
    # Send a request setting custom rate-limit test headers: limit to 2 requests and reset history first
    headers_limiter = {"x-test-rate-limit": "2"}
    
    # Reset history
    client.get("/", headers={"x-test-rate-limit-reset": "true"})
    
    # Request 1: should succeed
    res1 = client.get("/", headers=headers_limiter)
    assert res1.status_code == 200
    
    # Request 2: should succeed
    res2 = client.get("/", headers=headers_limiter)
    assert res2.status_code == 200
    
    # Request 3: should fail with 429 Too Many Requests
    res3 = client.get("/", headers=headers_limiter)
    assert res3.status_code == 429
    assert res3.json()["detail"] == "Too many requests. Please try again later."
