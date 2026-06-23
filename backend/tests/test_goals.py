import datetime
import pytest
from decimal import Decimal
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

def test_goals_lifecycle():
    # 1. Register and Login to get access token
    email = "goals_tester@example.com"
    pwd = "goalspassword123"
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

    # 2. Get goals (initially empty)
    list_res = client.get("/api/goals", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0

    # 3. Create a financial goal (target date is 10 months from now)
    target_date = (datetime.datetime.utcnow() + datetime.timedelta(days=300)).isoformat()
    goal_payload = {
        "name": "Buying Laptop",
        "target_amount": 50000.00,
        "current_amount": 10000.00,
        "target_date": target_date
    }
    
    create_res = client.post("/api/goals", json=goal_payload, headers=headers)
    assert create_res.status_code == 201
    goal_data = create_res.json()
    assert goal_data["name"] == "Buying Laptop"
    assert float(goal_data["progress_percentage"]) == 20.0
    assert float(goal_data["required_monthly_savings"]) > 0.0
    goal_id = goal_data["id"]

    # 4. Update the goal
    update_payload = {
        "current_amount": 25000.00
    }
    update_res = client.put(f"/api/goals/{goal_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert float(updated_data["progress_percentage"]) == 50.0

    # 5. Delete the goal
    del_res = client.delete(f"/api/goals/{goal_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["message"] == "Goal deleted successfully"

    # Confirm it is empty again
    list_res_again = client.get("/api/goals", headers=headers)
    assert len(list_res_again.json()) == 0

    # 6. Verify audit logs
    db = TestingSessionLocal()
    try:
        from app.models.user import User
        user = db.query(User).filter(User.email == email).first()
        audit_records = db.query(AuditLog).filter(AuditLog.user_id == user.id).all()
        actions = [a.action for a in audit_records]
        assert "create_goal" in actions
        assert "update_goal" in actions
        assert "delete_goal" in actions
    finally:
        db.close()
