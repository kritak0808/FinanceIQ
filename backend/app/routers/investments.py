from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.investment import InvestmentProfile, InvestmentRecommendation
from app.models.audit import AuditLog
from app.schemas.investment import InvestmentProfileCreate, InvestmentProfileResponse, InvestmentRecommendationResponse, RecommendationDetail
from app.services.investment_engine import investment_engine
from app.routers.deps import get_current_user
from decimal import Decimal

router = APIRouter(prefix="/investments", tags=["investments"])

@router.get("/profile", response_model=InvestmentProfileResponse)
def get_investment_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(InvestmentProfile).filter(InvestmentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Investment profile not found. Please create one.")
    return profile

@router.post("/profile", response_model=InvestmentProfileResponse)
def create_or_update_investment_profile(
    profile_in: InvestmentProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = db.query(InvestmentProfile).filter(InvestmentProfile.user_id == current_user.id).first()
    if profile:
        profile.age = profile_in.age
        profile.monthly_income = profile_in.monthly_income
        profile.current_savings = profile_in.current_savings
        profile.risk_tolerance = profile_in.risk_tolerance
    else:
        profile = InvestmentProfile(
            user_id=current_user.id,
            age=profile_in.age,
            monthly_income=profile_in.monthly_income,
            current_savings=profile_in.current_savings,
            risk_tolerance=profile_in.risk_tolerance
        )
        db.add(profile)
        
    audit = AuditLog(
        user_id=current_user.id,
        action="update_investment_profile",
        details=f"Investment profile saved: Risk: {profile.risk_tolerance}, age {profile.age}"
    )
    db.add(audit)
    db.commit()
    db.refresh(profile)
    return profile

@router.get("/recommendations", response_model=InvestmentRecommendationResponse)
def get_investment_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Try loading investment profile
    profile = db.query(InvestmentProfile).filter(InvestmentProfile.user_id == current_user.id).first()
    
    # Fallback to general profile or reasonable defaults
    if profile:
        age = profile.age
        income = profile.monthly_income
        savings = profile.current_savings
        risk = profile.risk_tolerance
    else:
        user_profile = current_user.profile
        age = 30 # default
        income = user_profile.monthly_income if user_profile else Decimal("50000.00")
        savings = Decimal("50000.00")
        risk = "Moderate"
        
    engine_result = investment_engine.recommend(age, income, savings, risk)
    
    # Save recommendations to database for auditing
    db.query(InvestmentRecommendation).filter(InvestmentRecommendation.user_id == current_user.id).delete()
    
    db_recs = []
    for rec in engine_result["recommendations"]:
        db_rec = InvestmentRecommendation(
            user_id=current_user.id,
            risk_tolerance=engine_result["risk_tolerance"],
            asset_class=rec["asset_class"],
            recommended_percentage=rec["recommended_percentage"],
            description=rec["description"]
        )
        db_recs.append(db_rec)
        
    db.add_all(db_recs)
    
    audit = AuditLog(
        user_id=current_user.id,
        action="generate_recommendations",
        details=f"Generated portfolio split for risk tolerance: {risk}"
    )
    db.add(audit)
    db.commit()
    
    return InvestmentRecommendationResponse(
        risk_tolerance=engine_result["risk_tolerance"],
        recommendations=[
            RecommendationDetail(
                asset_class=r["asset_class"],
                recommended_percentage=r["recommended_percentage"],
                description=r["description"]
            ) for r in engine_result["recommendations"]
        ],
        ai_explanation=engine_result["ai_explanation"]
    )
