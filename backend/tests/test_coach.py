import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.audit import AuditLog

# Setup temporary database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

import pytest

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

def test_coach_lifecycle():
    # 1. Register and Login to get access token
    email = "coach_tester@example.com"
    pwd = "coachpassword123"
    client.post(
        "/api/auth/register",
        json={"email": email, "password": pwd}
    )
    login_response = client.post(
        "/api/auth/login",
        data={"username": email, "password": pwd}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get sessions list (should be empty initially)
    list_res = client.get("/api/coach/sessions", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0

    # 3. Create a chat session
    create_res = client.post(
        "/api/coach/sessions",
        json={"title": "New Chat Session"},
        headers=headers
    )
    assert create_res.status_code == 201
    session_data = create_res.json()
    assert session_data["title"] == "New Chat Session"
    session_id = session_data["id"]

    # 4. Get individual session details
    detail_res = client.get(f"/api/coach/sessions/{session_id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == session_id
    assert len(detail_res.json()["messages"]) == 0

    # 5. Send a chat message (asking how to save)
    msg_res = client.post(
        f"/api/coach/sessions/{session_id}/message",
        json={"content": "How can I save more money?"},
        headers=headers
    )
    assert msg_res.status_code == 200
    msg_data = msg_res.json()
    assert msg_data["role"] == "assistant"
    # Local fallback advice should have generated a savings analysis or savings advice
    assert "saving" in msg_data["content"].lower() or "savings" in msg_data["content"].lower() or "rules of thumb" in msg_data["content"].lower()

    # 6. Verify session title has been updated from default "New Chat Session" to first few words of user query
    updated_session_res = client.get(f"/api/coach/sessions/{session_id}", headers=headers)
    assert updated_session_res.status_code == 200
    updated_session_data = updated_session_res.json()
    assert updated_session_data["title"] != "New Chat Session"
    assert "How can I save" in updated_session_data["title"]

    # 7. Check if messages list in session now has user + assistant messages (length 2)
    assert len(updated_session_data["messages"]) == 2
    assert updated_session_data["messages"][0]["role"] == "user"
    assert updated_session_data["messages"][1]["role"] == "assistant"

    # 8. Check that audit logs were recorded
    db = TestingSessionLocal()
    try:
        all_audits = db.query(AuditLog).all()
        print("ALL AUDITS:", [(a.user_id, a.action, a.details) for a in all_audits])
        audit_records = db.query(AuditLog).filter(AuditLog.user_id == updated_session_data["user_id"]).all()
        actions = [a.action for a in audit_records]
        assert "create_chat_session" in actions
        assert "send_coach_message" in actions
    finally:
        db.close()
