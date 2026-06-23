from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class BudgetBase(BaseModel):
    category: str
    limit_amount: Decimal
    period: str = "monthly"

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    category: Optional[str] = None
    limit_amount: Optional[Decimal] = None
    period: Optional[str] = None

class BudgetResponse(BudgetBase):
    id: int
    user_id: int
    current_spent: Decimal = Field(default=0.0)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BudgetRecommendation(BaseModel):
    category: str
    current_limit: Decimal
    recommended_limit: Decimal
    reason: str
    potential_savings: Decimal
