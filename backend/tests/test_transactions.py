import datetime
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

def test_transactions_lifecycle():
    # 1. Register and Login to get access token
    client.post(
        "/api/auth/register",
        json={"email": "transaction_tester@example.com", "password": "testpassword123"}
    )
    login_response = client.post(
        "/api/auth/login",
        data={"username": "transaction_tester@example.com", "password": "testpassword123"}
    )
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Add an expense manually without category (testing AI auto-categorization)
    tx_payload = {
        "amount": 350.00,
        "type": "expense",
        "merchant": "Swiggy Dinner",
        "category": "auto",
        "date": datetime.datetime.utcnow().isoformat(),
        "payment_method": "UPI",
        "description": "Late night meal ordering",
        "account_id": None
    }
    
    tx_response = client.post("/api/transactions", json=tx_payload, headers=headers)
    assert tx_response.status_code == 200
    tx_data = tx_response.json()
    assert tx_data["merchant"] == "Swiggy Dinner"
    # AI Categorizer should have mapped Swiggy to Food & Dining
    assert tx_data["category"] == "Food & Dining"
    assert tx_data["confidence_score"] > 0.8
    assert tx_data["is_anomaly"] is False
    
    # Add 2 more standard transactions in the category to populate the history count (needs len >= 3)
    tx_payload_2 = {
        "amount": 300.00,
        "type": "expense",
        "merchant": "Zomato Snack",
        "category": "Food & Dining",
        "date": datetime.datetime.utcnow().isoformat(),
        "payment_method": "UPI",
        "description": "Tea and samosa",
        "account_id": None
    }
    client.post("/api/transactions", json=tx_payload_2, headers=headers)

    tx_payload_3 = {
        "amount": 400.00,
        "type": "expense",
        "merchant": "McDonalds",
        "category": "Food & Dining",
        "date": datetime.datetime.utcnow().isoformat(),
        "payment_method": "UPI",
        "description": "Burger combo",
        "account_id": None
    }
    client.post("/api/transactions", json=tx_payload_3, headers=headers)
    
    # 3. Create a giant transaction to test anomaly alerts
    large_tx_payload = {
        "amount": 15000.00, # giant expense compared to previous
        "type": "expense",
        "merchant": "Gold Premium Purchase",
        "category": "Food & Dining",
        "date": datetime.datetime.utcnow().isoformat(),
        "payment_method": "UPI",
        "description": "Party food order",
        "account_id": None
    }
    large_tx_response = client.post("/api/transactions", json=large_tx_payload, headers=headers)
    assert large_tx_response.status_code == 200
    large_tx_data = large_tx_response.json()
    # Should flag as anomaly due to massive spike in Food & Dining
    assert large_tx_data["is_anomaly"] is True
    
    # 4. Check if fraud alerts are populated
    alerts_response = client.get("/api/admin/fraud-alerts", headers=headers)
    assert alerts_response.status_code == 200
    alerts_data = alerts_response.json()
    assert float(alerts_data[0]["amount"]) == 15000.00
    
    # 5. Fetch budget recommendations
    budget_recs_response = client.get("/api/budgets/recommendations", headers=headers)
    assert budget_recs_response.status_code == 200
    recs = budget_recs_response.json()
    assert len(recs) > 0

def test_transactions_extended_filters():
    # 1. Register and Login to get access token
    email = "extended_tester@example.com"
    pwd = "testpassword123"
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

    # 2. Test GET /transactions/categories
    cat_res = client.get("/api/transactions/categories", headers=headers)
    assert cat_res.status_code == 200
    categories = cat_res.json()
    assert "Food & Dining" in categories
    assert "Shopping" in categories

    # 3. Test GET /transactions/accounts
    acc_res = client.get("/api/transactions/accounts", headers=headers)
    assert acc_res.status_code == 200
    accounts = acc_res.json()
    assert len(accounts) >= 4  # defaults like Wallet Cash, Primary Bank Account, etc.
    primary_acc = accounts[0]

    # 4. Test POST /transactions/accounts (Create a custom account)
    new_acc_payload = {
        "name": "Kotak Savings Account",
        "type": "savings",
        "balance": 15000.00
    }
    create_acc_res = client.post("/api/transactions/accounts", json=new_acc_payload, headers=headers)
    assert create_acc_res.status_code == 201
    custom_acc = create_acc_res.json()
    assert custom_acc["name"] == "Kotak Savings Account"

    # 5. Seed some transactions
    tx_entries = [
        {"amount": 120.00, "merchant": "Swiggy Coffee", "category": "Food & Dining", "description": "Quick espresso", "account_id": primary_acc["id"]},
        {"amount": 2500.00, "merchant": "Decathlon Shoes", "category": "Shopping", "description": "Running track shoes", "account_id": primary_acc["id"]},
        {"amount": 40.00, "merchant": "Ola Cab", "category": "Transportation", "description": "Office ride", "account_id": primary_acc["id"]},
        {"amount": 750.00, "merchant": "Zomato Lunch", "category": "Food & Dining", "description": "Biryani meal", "account_id": custom_acc["id"]},
    ]
    for tx in tx_entries:
        tx_payload = {
            "amount": tx["amount"],
            "type": "expense",
            "merchant": tx["merchant"],
            "category": tx["category"],
            "date": datetime.datetime.utcnow().isoformat(),
            "payment_method": "UPI",
            "description": tx["description"],
            "account_id": tx["account_id"]
        }
        res = client.post("/api/transactions", json=tx_payload, headers=headers)
        assert res.status_code == 200

    # 6. Test Search: Query /transactions?search=Decathlon
    search_res = client.get("/api/transactions?search=Decathlon", headers=headers)
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert len(search_data) == 1
    assert search_data[0]["merchant"] == "Decathlon Shoes"

    # 7. Test Pagination: Query /transactions?limit=2&offset=1
    paginated_res = client.get("/api/transactions?limit=2&offset=1", headers=headers)
    assert paginated_res.status_code == 200
    paginated_data = paginated_res.json()
    assert len(paginated_data) == 2

    # 8. Test Summary stats
    summary_res = client.get("/api/transactions/summary", headers=headers)
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    assert summary_data["total_expense"] > 0
    assert "Food & Dining" in summary_data["category_breakdown"]
    assert float(summary_data["category_breakdown"]["Food & Dining"]) == 870.00  # 120.00 + 750.00

def test_receipt_ocr_upload():
    # 1. Register and Login to get access token
    email = "ocr_tester@example.com"
    pwd = "testpassword123"
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

    # 2. Simulate Uploading a Receipt file
    import io
    file_data = {"file": ("starbucks_invoice.png", io.BytesIO(b"fake image data"), "image/png")}
    
    upload_res = client.post(
        "/api/transactions/upload-receipt",
        files=file_data,
        headers=headers
    )
    assert upload_res.status_code == 200
    res_data = upload_res.json()
    
    # 3. Assert correct OCR extraction
    receipt = res_data["receipt"]
    transaction = res_data["transaction"]
    
    assert receipt["extracted_merchant"] == "STARBUCKS COFFEE"
    assert float(receipt["extracted_amount"]) == 550.00
    
    # 4. Assert correct transaction creation and item parsing injection
    assert transaction["merchant"] == "STARBUCKS COFFEE"
    assert float(transaction["amount"]) == 550.00
    assert transaction["category"] == "Food & Dining"
    assert "1x Caramel Macchiato" in transaction["description"]
    assert "1x Butter Croissant" in transaction["description"]

