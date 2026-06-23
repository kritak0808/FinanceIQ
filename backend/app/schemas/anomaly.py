from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

class FraudAlertResponse(BaseModel):
    id: int
    user_id: int
    transaction_id: int
    amount: Decimal
    merchant: str
    category: str
    reason: str
    severity: str  # low, medium, high
    status: str  # pending, reviewed, resolved, dismissed
    created_at: datetime

    class Config:
        from_attributes = True

class HealthScoreResponse(BaseModel):
    score: int  # 0 to 100
    savings_ratio: float
    debt_ratio: float
    budget_compliance: float
    spending_stability: float
    emergency_fund_coverage: float
    recommendations: List[str]
    created_at: datetime

    class Config:
        from_attributes = True
