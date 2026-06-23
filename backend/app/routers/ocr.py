from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.transaction import Receipt
from app.schemas.transaction import ReceiptResponse
from app.routers.deps import get_current_user

router = APIRouter(prefix="/ocr", tags=["ocr"])

@router.get("/receipts", response_model=List[ReceiptResponse])
def get_user_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch all processed receipt records for the active user."""
    return db.query(Receipt).filter(Receipt.user_id == current_user.id).order_by(Receipt.created_at.desc()).all()

@router.get("/metrics")
def get_ocr_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compute extraction counts and average confidence metrics for user receipt scans."""
    receipts = db.query(Receipt).filter(Receipt.user_id == current_user.id).all()
    total = len(receipts)
    
    if total == 0:
        return {"total_uploaded": 0, "average_confidence": 0.0, "success_rate": 100.0}
        
    avg_conf = sum(r.confidence for r in receipts) / total
    completed = sum(1 for r in receipts if r.ocr_status == "completed")
    success_rate = (completed / total) * 100
    
    return {
        "total_uploaded": total,
        "average_confidence": float(round(avg_conf, 2)),
        "success_rate": float(round(success_rate, 2))
    }
