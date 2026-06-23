import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Float
from sqlalchemy.orm import relationship
from app.database import Base

class InvestmentProfile(Base):
    __tablename__ = "investment_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    age = Column(Integer, nullable=False)
    monthly_income = Column(Numeric(12, 2), nullable=False)
    current_savings = Column(Numeric(12, 2), nullable=False)
    risk_tolerance = Column(String, nullable=False)  # Conservative, Moderate, Aggressive
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="investment_profile")

class InvestmentRecommendation(Base):
    __tablename__ = "investment_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    risk_tolerance = Column(String, nullable=False)
    asset_class = Column(String, nullable=False)  # Fixed Deposits, Mutual Funds, SIPs, Index Funds, Debt Funds
    recommended_percentage = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
