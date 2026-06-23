from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models.user import User, Profile, Account
from app.models.audit import AuditLog
from app.schemas.user import UserCreate, UserResponse, Token, ProfileUpdate, PasswordReset, ForgotPasswordRequest, ResetPasswordWithToken, EmailVerification
from app.utils.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.routers.deps import get_current_user, oauth2_scheme
from decimal import Decimal

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system."
        )
    
    # Hash password and create user
    hashed_pwd = get_password_hash(user_in.password)
    # The first registered user can be Admin for demonstration, else User
    is_first_user = db.query(User).count() == 0
    role = "Admin" if is_first_user else "User"
    
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        role=role,
        is_verified=False  # Requires email verification
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create associated default profile
    db_profile = Profile(
        user_id=db_user.id,
        first_name=user_in.email.split("@")[0].capitalize(),
        last_name="",
        currency="INR",
        monthly_income=Decimal("50000.00"),  # realistic default
        savings_target=Decimal("10000.00")
    )
    db.add(db_profile)
    
    # Create default accounts for transaction entries
    default_accounts = [
        Account(user_id=db_user.id, name="Primary Bank Account", type="checking", balance=Decimal("25000.00")),
        Account(user_id=db_user.id, name="Emergency Savings", type="savings", balance=Decimal("50000.00")),
        Account(user_id=db_user.id, name="Credit Card", type="credit_card", balance=Decimal("0.00")),
        Account(user_id=db_user.id, name="Wallet Cash", type="cash", balance=Decimal("2000.00"))
    ]
    db.add_all(default_accounts)
    
    # Add Audit log
    audit = AuditLog(
        user_id=db_user.id,
        action="register",
        details=f"User registered with email: {db_user.email}, role: {role}"
    )
    db.add(audit)
    
    db.commit()
    db.refresh(db_user)
    
    # Generate verification token and print to terminal (simulating email dispatch)
    from app.utils.security import create_verification_token
    token = create_verification_token(db_user.id)
    print(f"\n==================================================")
    print(f"[EMAIL SIMULATOR] Sending Verification Link to {db_user.email}")
    print(f"Verification URL: {settings.FRONTEND_URL}/verify-email?token={token}")
    print(f"==================================================\n")
    
    return db_user

@router.post("/login", response_model=Token)
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)
    
    # Log login
    audit = AuditLog(
        user_id=user.id,
        action="login",
        details=f"User logged in successfully"
    )
    db.add(audit)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_token(refresh_token)
    if not payload or not payload.get("refresh"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid refresh token"
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found or inactive"
        )
        
    access_token = create_access_token(subject=user.id, role=user.role)
    new_refresh_token = create_refresh_token(subject=user.id, role=user.role)
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserResponse)
def read_user_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me/profile", response_model=UserResponse)
def update_profile(
    profile_in: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    profile = current_user.profile
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        
    for field, value in profile_in.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
        
    audit = AuditLog(
        user_id=current_user.id,
        action="update_profile",
        details="User updated demographic profile settings"
    )
    db.add(audit)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/reset-password")
def reset_password(
    data: PasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
        
    current_user.hashed_password = get_password_hash(data.new_password)
    audit = AuditLog(
        user_id=current_user.id,
        action="reset_password",
        details="User updated account password"
    )
    db.add(audit)
    db.commit()
    return {"message": "Password updated successfully"}

@router.post("/verify-email")
def verify_email(data: EmailVerification, db: Session = Depends(get_db)):
    payload = decode_token(data.token)
    if not payload or payload.get("purpose") != "email_verification":
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_verified = True
    db.commit()
    return {"message": "Email verified successfully"}

@router.post("/resend-verification")
def resend_verification(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        return {"message": "Email is already verified"}
        
    from app.utils.security import create_verification_token
    token = create_verification_token(user.id)
    print(f"\n==================================================")
    print(f"[EMAIL SIMULATOR] Resending Verification Link to {user.email}")
    print(f"Verification URL: {settings.FRONTEND_URL}/verify-email?token={token}")
    print(f"==================================================\n")
    return {"message": "Verification email sent"}

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email does not exist")
        
    from app.utils.security import create_password_reset_token
    token = create_password_reset_token(user.id)
    print(f"\n==================================================")
    print(f"[EMAIL SIMULATOR] Sending Password Reset Link to {user.email}")
    print(f"Reset URL: {settings.FRONTEND_URL}/reset-password?token={token}")
    print(f"==================================================\n")
    return {"message": "Password reset email sent"}

@router.post("/reset-password-with-token")
def reset_password_with_token(data: ResetPasswordWithToken, db: Session = Depends(get_db)):
    payload = decode_token(data.token)
    if not payload or payload.get("purpose") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.hashed_password = get_password_hash(data.new_password)
    
    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="reset_password_with_token",
        details="User reset password using forgot password email token"
    )
    db.add(audit)
    db.commit()
    return {"message": "Password has been reset successfully"}

@router.post("/logout")
def logout_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    current_user: User = Depends(get_current_user)
):
    payload = decode_token(token)
    from app.config import settings
    import datetime
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    if payload and payload.get("exp"):
        expires_at = datetime.datetime.utcfromtimestamp(payload["exp"])
        
    from app.models.user import BlacklistedToken
    db_blacklisted = BlacklistedToken(
        token=token,
        expires_at=expires_at
    )
    db.add(db_blacklisted)
    
    audit = AuditLog(
        user_id=current_user.id,
        action="logout",
        details="User logged out and token invalidated"
    )
    db.add(audit)
    db.commit()
    return {"message": "Logged out successfully"}
