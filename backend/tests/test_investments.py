import pytest
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

def test_investments_lifecycle():
    # 1. Register and Login to get access token
    email = "invest_tester@example.com"
    pwd = "investpassword123"
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

    # 2. Get default profile (should return 404 since it's not created yet)
    prof_res = client.get("/api/investments/profile", headers=headers)
    assert prof_res.status_code == 404

    # 3. Create investment profile
    payload = {
        "age": 28,
        "monthly_income": 90000.00,
        "current_savings": 250000.00,
        "risk_tolerance": "Aggressive"
    }
    create_res = client.post("/api/investments/profile", json=payload, headers=headers)
    assert create_res.status_code == 200
    assert create_res.json()["risk_tolerance"] == "Aggressive"

    # 4. Fetch recommendations
    recs_res = client.get("/api/investments/recommendations", headers=headers)
    assert recs_res.status_code == 200
    recs_data = recs_res.json()
    assert recs_data["risk_tolerance"] == "Aggressive"
    assert len(recs_data["recommendations"]) > 0
    assert "ai_explanation" in recs_data
    
    # Assert allocations sum to 100%
    total_pct = sum(float(r["recommended_percentage"]) for r in recs_data["recommendations"])
    assert abs(total_pct - 100.0) < 0.01

    # 5. Update to Conservative and verify
    payload_conv = {
        "age": 45,
        "monthly_income": 120000.00,
        "current_savings": 800000.00,
        "risk_tolerance": "Conservative"
    }
    client.post("/api/investments/profile", json=payload_conv, headers=headers)
    
    recs_res_conv = client.get("/api/investments/recommendations", headers=headers)
    assert recs_res_conv.status_code == 200
    recs_data_conv = recs_res_conv.json()
    assert recs_data_conv["risk_tolerance"] == "Conservative"
    total_pct_conv = sum(float(r["recommended_percentage"]) for r in recs_data_conv["recommendations"])
    assert abs(total_pct_conv - 100.0) < 0.01

    # 6. Verify audit logs
    db = TestingSessionLocal()
    try:
        from app.models.user import User
        user = db.query(User).filter(User.email == email).first()
        audit_records = db.query(AuditLog).filter(AuditLog.user_id == user.id).all()
        actions = [a.action for a in audit_records]
        assert "update_investment_profile" in actions
        assert "generate_recommendations" in actions
    finally:
        db.close()
