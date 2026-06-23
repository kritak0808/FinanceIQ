from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# Profile Schemas
class ProfileBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    currency: str = "INR"
    monthly_income: Decimal = Field(default=0.0)
    savings_target: Decimal = Field(default=0.0)

class ProfileUpdate(ProfileBase):
    pass

class ProfileResponse(ProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Account Schemas
class AccountBase(BaseModel):
    name: str
    type: str  # checking, savings, credit_card, cash
    balance: Decimal = Field(default=0.0)

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[Decimal] = None

class AccountResponse(AccountBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    profile: Optional[ProfileResponse] = None
    accounts: List[AccountResponse] = []

    class Config:
        from_attributes = True

# Auth token Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class PasswordReset(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordWithToken(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class EmailVerification(BaseModel):
    token: str

