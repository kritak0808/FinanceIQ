from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.forecast import ForecastResponse
from app.services.forecaster import forecaster
from app.routers.deps import get_current_user

router = APIRouter(prefix="/forecasts", tags=["forecasts"])

@router.get("", response_model=ForecastResponse)
def get_expense_forecast(
    period: str = Query("monthly", regex="^(weekly|monthly|quarterly)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate future expense forecasts (weekly, monthly, quarterly) based on transaction history.
    """
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    forecast_results = forecaster.forecast(transactions, period)
    return forecast_results
