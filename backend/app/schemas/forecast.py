from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

class ForecastDataPoint(BaseModel):
    date: str
    historical_value: Optional[Decimal] = None
    forecast_value: Optional[Decimal] = None
    lower_bound: Optional[Decimal] = None
    upper_bound: Optional[Decimal] = None

class ForecastResponse(BaseModel):
    period: str  # weekly, monthly, quarterly
    data: List[ForecastDataPoint]
    trend_analysis: str
