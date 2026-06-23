from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class InvestmentProfileCreate(BaseModel):
    age: int = Field(..., ge=18, le=120)
    monthly_income: Decimal = Field(..., gt=0)
    current_savings: Decimal = Field(..., ge=0)
    risk_tolerance: str  # Conservative, Moderate, Aggressive

class InvestmentProfileResponse(BaseModel):
    id: int
    user_id: int
    age: int
    monthly_income: Decimal
    current_savings: Decimal
    risk_tolerance: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RecommendationDetail(BaseModel):
    asset_class: str  # Fixed Deposits, Mutual Funds, SIPs, Index Funds, Debt Funds
    recommended_percentage: float
    description: str

class InvestmentRecommendationResponse(BaseModel):
    risk_tolerance: str
    recommendations: List[RecommendationDetail]
    ai_explanation: str
