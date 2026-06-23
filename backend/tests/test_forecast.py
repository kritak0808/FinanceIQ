import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
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

def test_forecast_lifecycle():
    # 1. Register and Login to get access token
    email = "forecast_tester@example.com"
    pwd = "forecastpassword123"
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

    # 2. Query forecast with no transactions (should run fallback simulator)
    fallback_res = client.get("/api/forecasts?period=monthly", headers=headers)
    assert fallback_res.status_code == 200
    fallback_data = fallback_res.json()
    assert fallback_data["period"] == "monthly"
    assert len(fallback_data["data"]) > 0
    assert "trend_analysis" in fallback_data
    assert len(fallback_data["trend_analysis"]) > 0

    # Verify fallback fields
    first_pt = fallback_data["data"][0]
    assert "date" in first_pt
    assert "historical_value" in first_pt or "forecast_value" in first_pt

    # 3. Seed enough transactions (>= 10) to run the regression forecaster
    # Let's seed transactions over the last 5 months
    now = datetime.datetime.utcnow()
    db = TestingSessionLocal()
    try:
        # Get the registered user id
        from app.models.user import User
        user = db.query(User).filter(User.email == email).first()
        user_id = user.id

        # Insert 10 transactions
        for i in range(10):
            tx_date = now - datetime.timedelta(days=15 * i)
            tx = Transaction(
                user_id=user_id,
                amount=1500.00 + (i * 200.00),  # increasing trend going backward, which means decreasing trend forward
                type="expense",
                merchant=f"Merchant {i}",
                category="Food & Dining",
                date=tx_date,
                payment_method="UPI",
                description=f"Transaction description {i}",
                confidence_score=1.0,
                is_anomaly=False
            )
            db.add(tx)
        db.commit()
    finally:
        db.close()

    # 4. Query forecast with enough transactions (should run Scikit-Learn regression)
    for period in ["weekly", "monthly", "quarterly"]:
        res = client.get(f"/api/forecasts?period={period}", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["period"] == period
        assert len(data["data"]) > 0
        assert "trend_analysis" in data
        assert len(data["trend_analysis"]) > 0
