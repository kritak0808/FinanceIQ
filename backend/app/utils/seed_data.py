import datetime
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.models.user import User, Profile, Account
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.goal import FinancialGoal
from app.models.anomaly import FraudAlert
from app.models.audit import AuditLog
from app.utils.security import get_password_hash
from decimal import Decimal

def seed_db(db: Session):
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    
    # 1. Check if user already exists
    if db.query(User).filter(User.email == "user@finsense.ai").first():
        print("Database already seeded.")
        return
        
    print("Seeding database...")
    
    # 2. Create Admin User
    admin_pwd = get_password_hash("admin123")
    admin_user = User(
        email="admin@finsense.ai",
        hashed_password=admin_pwd,
        role="Admin",
        is_verified=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    admin_profile = Profile(
        user_id=admin_user.id,
        first_name="FinSense",
        last_name="Administrator",
        currency="INR",
        monthly_income=Decimal("120000.00"),
        savings_target=Decimal("30000.00")
    )
    db.add(admin_profile)
    
    admin_accounts = [
        Account(user_id=admin_user.id, name="Corporate Account", type="checking", balance=Decimal("150000.00")),
        Account(user_id=admin_user.id, name="Reserve savings", type="savings", balance=Decimal("450000.00"))
    ]
    db.add_all(admin_accounts)
    
    # 3. Create Standard User
    user_pwd = get_password_hash("user123")
    std_user = User(
        email="user@finsense.ai",
        hashed_password=user_pwd,
        role="User",
        is_verified=True
    )
    db.add(std_user)
    db.commit()
    db.refresh(std_user)
    
    std_profile = Profile(
        user_id=std_user.id,
        first_name="Kritak",
        last_name="Sharma",
        currency="INR",
        monthly_income=Decimal("75000.00"),
        savings_target=Decimal("15000.00")
    )
    db.add(std_profile)
    
    # Accounts for standard user
    acc_checking = Account(user_id=std_user.id, name="HDFC Salary Account", type="checking", balance=Decimal("48500.00"))
    acc_savings = Account(user_id=std_user.id, name="SBI Emergency Fund", type="savings", balance=Decimal("95000.00"))
    acc_card = Account(user_id=std_user.id, name="ICICI Amazon Credit Card", type="credit_card", balance=Decimal("12400.00"))
    acc_cash = Account(user_id=std_user.id, name="Physical Wallet", type="cash", balance=Decimal("1500.00"))
    db.add_all([acc_checking, acc_savings, acc_card, acc_cash])
    db.commit()
    db.refresh(acc_checking)
    db.refresh(acc_savings)
    db.refresh(acc_card)
    db.refresh(acc_cash)
    
    # 4. Create Budgets
    budgets = [
        Budget(user_id=std_user.id, category="Food & Dining", limit_amount=Decimal("8000.00"), period="monthly"),
        Budget(user_id=std_user.id, category="Shopping", limit_amount=Decimal("5000.00"), period="monthly"),
        Budget(user_id=std_user.id, category="Transportation", limit_amount=Decimal("3000.00"), period="monthly"),
        Budget(user_id=std_user.id, category="Utilities", limit_amount=Decimal("4000.00"), period="monthly"),
        Budget(user_id=std_user.id, category="Entertainment", limit_amount=Decimal("3000.00"), period="monthly")
    ]
    db.add_all(budgets)
    
    # 5. Create Savings Goals
    goals = [
        FinancialGoal(
            user_id=std_user.id,
            name="MacBook Air M3",
            target_amount=Decimal("95000.00"),
            current_amount=Decimal("45000.00"),
            target_date=datetime.datetime.utcnow() + datetime.timedelta(days=180)
        ),
        FinancialGoal(
            user_id=std_user.id,
            name="Emergency Rainy Day Fund",
            target_amount=Decimal("150000.00"),
            current_amount=Decimal("95000.00"),
            target_date=datetime.datetime.utcnow() + datetime.timedelta(days=365)
        )
    ]
    db.add_all(goals)
    
    # 6. Create Transactions (over last 45 days)
    now = datetime.datetime.utcnow()
    
    # Salary deposits (2 deposits)
    salary_1 = Transaction(
        user_id=std_user.id, account_id=acc_checking.id, amount=Decimal("75000.00"),
        type="income", merchant="FINTECH CORP SALARY", category="Investment",
        date=now - datetime.timedelta(days=30), payment_method="NetBanking",
        description="Monthly salary deposit", confidence_score=1.0, is_anomaly=False
    )
    salary_2 = Transaction(
        user_id=std_user.id, account_id=acc_checking.id, amount=Decimal("75000.00"),
        type="income", merchant="FINTECH CORP SALARY", category="Investment",
        date=now - datetime.timedelta(days=1), payment_method="NetBanking",
        description="Monthly salary deposit", confidence_score=1.0, is_anomaly=False
    )
    db.add_all([salary_1, salary_2])
    
    # Standard Expenses
    standard_expenses = [
        # Food & Dining
        (Decimal("320.00"), "Swiggy", "Food & Dining", 28, "UPI", "Lunch box order"),
        (Decimal("180.00"), "Zomato", "Food & Dining", 27, "UPI", "Evening snacks"),
        (Decimal("1200.00"), "Barbeque Nation", "Food & Dining", 25, "Card", "Dinner with team"),
        (Decimal("450.00"), "Starbucks Coffee", "Food & Dining", 22, "Card", "Caramel Macchiato"),
        (Decimal("380.00"), "Swiggy", "Food & Dining", 18, "UPI", "Breakfast delivery"),
        (Decimal("250.00"), "McDonald's", "Food & Dining", 14, "Cash", "Meal combo"),
        (Decimal("650.00"), "Zomato", "Food & Dining", 10, "UPI", "Dinner order"),
        (Decimal("520.00"), "Swiggy", "Food & Dining", 5, "UPI", "Lunch order"),
        (Decimal("450.00"), "Starbucks Coffee", "Food & Dining", 2, "UPI", "Frappuccino"),
        
        # Shopping
        (Decimal("1500.00"), "Amazon Retail", "Shopping", 26, "Card", "Wireless Mouse"),
        (Decimal("2400.00"), "Myntra Fashion", "Shopping", 20, "Card", "Jeans and T-shirt"),
        (Decimal("850.00"), "Flipkart", "Shopping", 12, "UPI", "Phone Charger"),
        (Decimal("1999.00"), "Decathlon Store", "Shopping", 8, "Card", "Running Shoes"),
        
        # Transportation
        (Decimal("220.00"), "Uber Cab", "Transportation", 29, "UPI", "Cab to office"),
        (Decimal("240.00"), "Ola Ride", "Transportation", 27, "UPI", "Ride back home"),
        (Decimal("210.00"), "Uber Cab", "Transportation", 23, "UPI", "Cab to client meeting"),
        (Decimal("2500.00"), "Shell Petrol Pump", "Transportation", 19, "Card", "Fuel recharge for bike"),
        (Decimal("230.00"), "Uber Cab", "Transportation", 15, "UPI", "Cab ride"),
        (Decimal("210.00"), "Ola Ride", "Transportation", 9, "UPI", "Evening ride"),
        (Decimal("220.00"), "Uber Cab", "Transportation", 3, "UPI", "Cab to station"),
        
        # Utilities
        (Decimal("2200.00"), "BESCOM Electricity", "Utilities", 28, "NetBanking", "Electricity bill"),
        (Decimal("799.00"), "Airtel Broadband", "Utilities", 25, "UPI", "Monthly WiFi recharge"),
        (Decimal("299.00"), "Jio Mobile Recharge", "Utilities", 15, "UPI", "Mobile plan"),
        
        # Entertainment
        (Decimal("649.00"), "Netflix India", "Entertainment", 24, "Card", "Premium membership"),
        (Decimal("299.00"), "Spotify Music", "Entertainment", 22, "Card", "Family music subscription"),
        (Decimal("450.00"), "BookMyShow", "Entertainment", 16, "UPI", "Movie ticket"),
        
        # Healthcare
        (Decimal("680.00"), "Apollo Pharmacy", "Healthcare", 21, "Cash", "Prescribed medicines"),
        (Decimal("1500.00"), "Clove Dental Clinic", "Healthcare", 13, "Card", "Dental checkup"),
        
        # Travel
        (Decimal("8500.00"), "MakeMyTrip Hotel", "Travel", 17, "Card", "Weekend staycation resort"),
        
        # Investment
        (Decimal("5000.00"), "Zerodha Mutual Fund SIP", "Investment", 28, "NetBanking", "Nifty Index SIP"),
        (Decimal("5000.00"), "Zerodha Mutual Fund SIP", "Investment", 2, "NetBanking", "Nifty Index SIP")
    ]
    
    db_expenses = []
    for amt, merchant, category, days_ago, pay_method, desc in standard_expenses:
        # Determine account
        acc_id = acc_checking.id
        if pay_method == "Card":
            acc_id = acc_card.id
        elif pay_method == "Cash":
            acc_id = acc_cash.id
            
        trans = Transaction(
            user_id=std_user.id,
            account_id=acc_id,
            amount=amt,
            type="expense",
            merchant=merchant,
            category=category,
            date=now - datetime.timedelta(days=days_ago),
            payment_method=pay_method,
            description=desc,
            confidence_score=0.95,
            is_anomaly=False
        )
        db_expenses.append(trans)
        
    db.add_all(db_expenses)
    db.commit()
    
    # 7. Seed anomalous transaction (₹4500 Swiggy Party order)
    # Average Swiggy order in Food is ~₹300 - ₹500
    anomaly_trans = Transaction(
        user_id=std_user.id,
        account_id=acc_checking.id,
        amount=Decimal("4500.00"),
        type="expense",
        merchant="Swiggy Party Bulk",
        category="Food & Dining",
        date=now - datetime.timedelta(days=4),
        payment_method="UPI",
        description="Office team dinner catering",
        confidence_score=0.95,
        is_anomaly=True
    )
    db.add(anomaly_trans)
    db.commit()
    db.refresh(anomaly_trans)
    
    # Fraud alert
    fraud = FraudAlert(
        user_id=std_user.id,
        transaction_id=anomaly_trans.id,
        reason="Food & Dining transaction amount of ₹4,500.00 is 10.2x higher than your average spend of ₹440.00 in this category.",
        severity="medium",
        status="pending"
    )
    db.add(fraud)
    
    # Audit log
    audit_reg = AuditLog(
        user_id=std_user.id,
        action="seed_database",
        details="Seeded transaction history and parameters for user: user@finsense.ai"
    )
    db.add(audit_reg)
    
    db.commit()
    print("Database seeding completed.")
