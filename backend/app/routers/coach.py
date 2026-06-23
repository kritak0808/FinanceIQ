import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage
from app.models.audit import AuditLog
from app.schemas.chat import ChatSessionCreate, ChatSessionResponse, ChatMessageCreate, ChatMessageResponse
from app.services.coach_service import coach_service
from app.routers.deps import get_current_user

router = APIRouter(prefix="/coach", tags=["coach"])

@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_chat_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all chat sessions for the current user."""
    return db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.updated_at.desc()).all()

@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
def create_chat_session(
    session_in: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chat session."""
    db_session = ChatSession(
        user_id=current_user.id,
        title=session_in.title or "New Chat Session"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="create_chat_session",
        details=f"Created chat session: {db_session.title} (ID {db_session.id})"
    )
    db.add(audit)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_chat_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detail of a single chat session including message history."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session

@router.post("/sessions/{session_id}/message", response_model=ChatMessageResponse)
def send_chat_message(
    session_id: int,
    message_in: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send a message to the AI coach.
    Returns the assistant's reply.
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    # 1. Save User Message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=message_in.content
    )
    db.add(user_msg)
    
    # If session title is default, update it with the first 4 words of the query
    if session.title == "New Chat Session" or session.title == "New Chat":
        words = message_in.content.split()
        title = " ".join(words[:4])
        if len(words) > 4:
            title += "..."
        session.title = title
        
    db.commit()
    
    # 2. Get past chat history formatted for LLM
    past_messages = db.query(ChatMessage).filter(ChatMessage.session_id == session.id).order_by(ChatMessage.created_at.asc()).all()
    formatted_history = []
    for msg in past_messages[:-1]: # exclude the user message just added
        formatted_history.append({"role": msg.role, "content": msg.content})
        
    # 3. Call Coach Service
    reply_content = coach_service.chat(current_user, message_in.content, formatted_history)
    
    # 4. Save Assistant Response
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=reply_content
    )
    db.add(assistant_msg)
    
    # Update session modified timestamp
    session.updated_at = datetime.datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="send_coach_message",
        details=f"Sent chat message to session {session.id}"
    )
    db.add(audit)
    
    db.commit()
    db.refresh(assistant_msg)
    return assistant_msg
