from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class TransactionBase(BaseModel):
    amount: Decimal
    type: str = "expense"  # income, expense
    merchant: str
    category: str = "Miscellaneous"
    date: datetime = Field(default_factory=datetime.utcnow)
    payment_method: str = "Cash"
    description: Optional[str] = None
    account_id: Optional[int] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    amount: Optional[Decimal] = None
    type: Optional[str] = None
    merchant: Optional[str] = None
    category: Optional[str] = None
    date: Optional[datetime] = None
    payment_method: Optional[str] = None
    description: Optional[str] = None
    account_id: Optional[int] = None
    is_anomaly: Optional[bool] = None

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    receipt_id: Optional[int] = None
    confidence_score: float
    is_anomaly: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ReceiptResponse(BaseModel):
    id: int
    user_id: int
    file_name: str
    file_path: str
    ocr_status: str
    extracted_text: Optional[str] = None
    extracted_amount: Optional[Decimal] = None
    extracted_merchant: Optional[str] = None
    extracted_date: Optional[datetime] = None
    confidence: float
    created_at: datetime

    class Config:
        from_attributes = True

class CSVImportResponse(BaseModel):
    message: str
    imported_count: int
    anomalies_detected: int

class ReceiptUploadResponse(BaseModel):
    receipt: ReceiptResponse
    transaction: TransactionResponse

