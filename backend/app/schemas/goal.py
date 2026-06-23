from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal

class GoalBase(BaseModel):
    name: str
    target_amount: Decimal
    current_amount: Decimal = Field(default=0.0)
    target_date: datetime

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[Decimal] = None
    current_amount: Optional[Decimal] = None
    target_date: Optional[datetime] = None

class GoalResponse(GoalBase):
    id: int
    user_id: int
    required_monthly_savings: Decimal
    expected_completion_date: datetime
    progress_percentage: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
