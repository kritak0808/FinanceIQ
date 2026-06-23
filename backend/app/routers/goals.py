import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.goal import FinancialGoal
from app.models.audit import AuditLog
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse
from app.routers.deps import get_current_user
from decimal import Decimal

router = APIRouter(prefix="/goals", tags=["goals"])

def calculate_goal_metrics(g: FinancialGoal) -> GoalResponse:
    # Progress percentage
    progress = 0.0
    if g.target_amount > 0:
        progress = float(g.current_amount / g.target_amount) * 100.0
    progress = min(100.0, max(0.0, progress))
    
    # Required monthly savings
    now = datetime.datetime.utcnow()
    target = g.target_date
    
    # Calculate months left
    months_left = (target.year - now.year) * 12 + (target.month - now.month)
    if now.day < target.day:
        months_left += 1
        
    # Minimum 1 month to avoid division by zero or negative rates
    months_left = max(1, months_left)
    
    remaining_amount = max(Decimal("0.00"), g.target_amount - g.current_amount)
    required_monthly = remaining_amount / Decimal(str(months_left))
    
    return GoalResponse(
        id=g.id,
        user_id=g.user_id,
        name=g.name,
        target_amount=g.target_amount,
        current_amount=g.current_amount,
        target_date=g.target_date,
        required_monthly_savings=Decimal(round(required_monthly, 2)),
        expected_completion_date=g.target_date,
        progress_percentage=round(progress, 2),
        created_at=g.created_at,
        updated_at=g.updated_at
    )

@router.get("", response_model=List[GoalResponse])
def get_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goals = db.query(FinancialGoal).filter(FinancialGoal.user_id == current_user.id).all()
    return [calculate_goal_metrics(g) for g in goals]

@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    goal_in: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_goal = FinancialGoal(
        user_id=current_user.id,
        name=goal_in.name,
        target_amount=goal_in.target_amount,
        current_amount=goal_in.current_amount,
        target_date=goal_in.target_date
    )
    db.add(db_goal)
    
    audit = AuditLog(
        user_id=current_user.id,
        action="create_goal",
        details=f"Created savings goal: {db_goal.name}, target: {db_goal.target_amount}"
    )
    db.add(audit)
    db.commit()
    db.refresh(db_goal)
    return calculate_goal_metrics(db_goal)

@router.put("/{id}", response_model=GoalResponse)
def update_goal(
    id: int,
    goal_in: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_goal = db.query(FinancialGoal).filter(FinancialGoal.id == id, FinancialGoal.user_id == current_user.id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    for field, value in goal_in.model_dump(exclude_unset=True).items():
        setattr(db_goal, field, value)
        
    audit = AuditLog(
        user_id=current_user.id,
        action="update_goal",
        details=f"Updated savings goal ID {id}: current {db_goal.current_amount}"
    )
    db.add(audit)
    db.commit()
    db.refresh(db_goal)
    return calculate_goal_metrics(db_goal)

@router.delete("/{id}")
def delete_goal(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_goal = db.query(FinancialGoal).filter(FinancialGoal.id == id, FinancialGoal.user_id == current_user.id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    audit = AuditLog(
        user_id=current_user.id,
        action="delete_goal",
        details=f"Deleted savings goal: ID {id}, Name: {db_goal.name}"
    )
    db.add(audit)
    db.delete(db_goal)
    db.commit()
    return {"message": "Goal deleted successfully"}
