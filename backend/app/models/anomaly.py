import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from app.database import Base

class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    reason = Column(String, nullable=False)
    severity = Column(String, default="medium")  # low, medium, high
    status = Column(String, default="pending")  # pending, reviewed, resolved, dismissed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="fraud_alerts")
    transaction = relationship("Transaction", back_populates="fraud_alerts")

class HealthScore(Base):
    __tablename__ = "health_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score = Column(Integer, nullable=False)  # 0 to 100
    savings_ratio = Column(Float, default=0.0)
    debt_ratio = Column(Float, default=0.0)
    budget_compliance = Column(Float, default=0.0)
    spending_stability = Column(Float, default=0.0)
    emergency_fund_coverage = Column(Float, default=0.0)
    recommendations = Column(Text, nullable=True)  # JSON or newline-separated string
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="health_scores")
