from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db

# Setup temporary in-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

import pytest

# Override get_db dependency
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

# Create tables
Base.metadata.create_all(bind=engine)

def test_register_and_login():
    # 1. Register a new user
    reg_response = client.post(
        "/api/auth/register",
        json={"email": "testuser@example.com", "password": "testpassword123"}
    )
    assert reg_response.status_code == 201
    data = reg_response.json()
    assert data["email"] == "testuser@example.com"
    assert "id" in data
    
    # 2. Try registering duplicate email
    dup_response = client.post(
        "/api/auth/register",
        json={"email": "testuser@example.com", "password": "testpassword123"}
    )
    assert dup_response.status_code == 400
    
    # 3. Login
    login_response = client.post(
        "/api/auth/login",
        data={"username": "testuser@example.com", "password": "testpassword123"}
    )
    assert login_response.status_code == 200
    tokens = login_response.json()
    assert "access_token" in tokens
    assert tokens["token_type"] == "bearer"
    
    # 4. Access user profile using access token
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    me_response = client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 200
    user_info = me_response.json()
    assert user_info["email"] == "testuser@example.com"
    assert user_info["profile"]["first_name"] == "Testuser"

def test_email_verification_logout_and_password_reset():
    # 1. Register a new user (is_verified starts as False)
    email = "authflow@example.com"
    pwd = "securepassword123"
    reg_response = client.post(
        "/api/auth/register",
        json={"email": email, "password": pwd}
    )
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    assert reg_data["is_verified"] is False

    # Simulate generating and receiving verification token
    from app.utils.security import create_verification_token
    verify_token = create_verification_token(reg_data["id"])

    # 2. Verify Email
    verify_response = client.post(
        "/api/auth/verify-email",
        json={"token": verify_token}
    )
    assert verify_response.status_code == 200
    assert verify_response.json()["message"] == "Email verified successfully"

    # Verify user profile shows is_verified: True now
    login_res = client.post(
        "/api/auth/login",
        data={"username": email, "password": pwd}
    )
    assert login_res.status_code == 200
    tokens = login_res.json()
    access_token = tokens["access_token"]

    headers = {"Authorization": f"Bearer {access_token}"}
    me_response = client.get("/api/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["is_verified"] is True

    # 3. Log out (invalidates token)
    logout_res = client.post("/api/auth/logout", headers=headers)
    assert logout_res.status_code == 200
    assert logout_res.json()["message"] == "Logged out successfully"

    # Attempting to call /me again should fail with 401
    me_revoked_res = client.get("/api/auth/me", headers=headers)
    assert me_revoked_res.status_code == 401
    assert "logged out" in me_revoked_res.json()["detail"].lower()

    # 4. Forgot Password
    forgot_res = client.post(
        "/api/auth/forgot-password",
        json={"email": email}
    )
    assert forgot_res.status_code == 200

    # Simulate generating and receiving reset token
    from app.utils.security import create_password_reset_token
    reset_token = create_password_reset_token(reg_data["id"])
    new_pwd = "brandnewpassword999"

    # Reset password with token
    reset_res = client.post(
        "/api/auth/reset-password-with-token",
        json={"token": reset_token, "new_password": new_pwd}
    )
    assert reset_res.status_code == 200

    # Login with new password
    new_login_res = client.post(
        "/api/auth/login",
        data={"username": email, "password": new_pwd}
    )
    assert new_login_res.status_code == 200
    new_tokens = new_login_res.json()
    assert "access_token" in new_tokens

