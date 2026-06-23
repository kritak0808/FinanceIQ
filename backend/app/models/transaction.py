import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Float
from sqlalchemy.orm import relationship
from app.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id", ondelete="SET NULL"), nullable=True)
    
    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(String, default="expense")  # income, expense
    merchant = Column(String, nullable=False)
    category = Column(String, nullable=False, default="Miscellaneous")
    date = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    payment_method = Column(String, default="Cash")  # Card, Cash, UPI, NetBanking
    description = Column(String, nullable=True)
    
    # ML categorization/fraud fields
    confidence_score = Column(Float, default=1.0)
    is_anomaly = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    receipt = relationship("Receipt", back_populates="transaction", uselist=False)
    fraud_alerts = relationship("FraudAlert", back_populates="transaction", cascade="all, delete-orphan")

class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    ocr_status = Column(String, default="pending")  # pending, completed, failed
    extracted_text = Column(String, nullable=True)
    extracted_amount = Column(Numeric(12, 2), nullable=True)
    extracted_merchant = Column(String, nullable=True)
    extracted_date = Column(DateTime, nullable=True)
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
    transaction = relationship("Transaction", back_populates="receipt", uselist=False)
