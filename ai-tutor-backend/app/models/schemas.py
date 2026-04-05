from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.db_models import DocumentStatus


# ─── Document Schemas ────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: str
    owner_id: str
    file_name: str
    file_size_mb: float
    page_count: int
    status: DocumentStatus
    uploaded_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Chat Schemas ─────────────────────────────────────────────────────────────

class ChatSource(BaseModel):
    document_id: str
    page_number: int
    text_excerpt: str


class MessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    sources: Optional[list[ChatSource]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    id: str
    user_id: str
    document_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class ChatSessionDetail(ChatSessionResponse):
    messages: list[MessageResponse] = []

    class Config:
        from_attributes = True


class AskRequest(BaseModel):
    question: str
    session_id: Optional[str] = None  # If None, create a new session


class AskResponse(BaseModel):
    session_id: str
    message: MessageResponse
