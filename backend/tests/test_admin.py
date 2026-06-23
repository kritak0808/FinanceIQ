import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.anomaly import FraudAlert
from app.models.transaction import Transaction

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

def test_admin_and_fraud_alerts():
    # 1. Register first user (automatically becomes "Admin" role because db is empty)
    admin_email = "admin_user@example.com"
    admin_pwd = "adminpassword123"
    reg1_res = client.post(
        "/api/auth/register",
        json={"email": admin_email, "password": admin_pwd}
    )
    assert reg1_res.status_code == 201
    assert reg1_res.json()["role"] == "Admin"

    login1_res = client.post(
        "/api/auth/login",
        data={"username": admin_email, "password": admin_pwd}
    )
    admin_token = login1_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Register second user (becomes standard "User" role)
    user_email = "standard_user@example.com"
    user_pwd = "userpassword123"
    reg2_res = client.post(
        "/api/auth/register",
        json={"email": user_email, "password": user_pwd}
    )
    assert reg2_res.status_code == 201
    assert reg2_res.json()["role"] == "User"

    login2_res = client.post(
        "/api/auth/login",
        data={"username": user_email, "password": user_pwd}
    )
    user_token = login2_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # 3. Test standard user access to admin endpoints (should be 403 Forbidden)
    forbidden_endpoints = [
        "/api/admin/users",
        "/api/admin/system-health",
        "/api/admin/audit-logs",
        "/api/admin/ai-metrics"
    ]
    for endpoint in forbidden_endpoints:
        res = client.get(endpoint, headers=user_headers)
        assert res.status_code == 403

    # 4. Test admin user access to admin endpoints (should be 200 OK)
    res_users = client.get("/api/admin/users", headers=admin_headers)
    assert res_users.status_code == 200
    assert len(res_users.json()) == 2

    res_health = client.get("/api/admin/system-health", headers=admin_headers)
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    res_ai = client.get("/api/admin/ai-metrics", headers=admin_headers)
    assert res_ai.status_code == 200

    res_audit = client.get("/api/admin/audit-logs", headers=admin_headers)
    assert res_audit.status_code == 200

    # 5. Create a fraud alert manually in the database to test listing and resolution
    db = TestingSessionLocal()
    try:
        from app.models.user import User
        u = db.query(User).filter(User.email == user_email).first()
        
        # Add a dummy transaction
        t = Transaction(
            user_id=u.id,
            amount=25000.00,
            type="expense",
            merchant="Unusual Merchant",
            category="Shopping",
            payment_method="Credit Card",
            description="Suspect purchase"
        )
        db.add(t)
        db.commit()
        db.refresh(t)

        alert = FraudAlert(
            user_id=u.id,
            transaction_id=t.id,
            reason="Unusually large purchase for Shopping category",
            severity="High",
            status="active"
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        alert_id = alert.id
    finally:
        db.close()

    # 6. User fetches their own fraud alerts
    user_alerts_res = client.get("/api/admin/fraud-alerts", headers=user_headers)
    assert user_alerts_res.status_code == 200
    user_alerts = user_alerts_res.json()
    assert len(user_alerts) == 1
    assert user_alerts[0]["merchant"] == "Unusual Merchant"

    # 7. User resolves the alert
    resolve_res = client.post(f"/api/admin/fraud-alerts/{alert_id}/resolve?action=resolve", headers=user_headers)
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "resolved"

    # Verify audit log logged the resolution
    res_audit_again = client.get("/api/admin/audit-logs", headers=admin_headers)
    actions = [a["action"] for a in res_audit_again.json()]
    assert "resolve_fraud_alert" in actions
