from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ChatMessageCreate(BaseModel):
    content: str

class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str  # user, assistant
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat Session"

class ChatSessionResponse(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True
