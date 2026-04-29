from pydantic import BaseModel, Field
from datetime import datetime
from uuid import uuid4
from enum import Enum
from typing import List, Optional

class DocumentStatus(str, Enum):
    UPLOADING = "UPLOADING"
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"

class UserSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    user_agent: str = ""
    ip_address: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)

class UserPreferences(BaseModel):
    email_notifications: bool = True
    ai_response_detail: str = "balanced"  # "concise" | "balanced" | "detailed"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    student_id: str
    full_name: str
    email: str
    hashed_password: str
    bio: Optional[str] = None
    is_pro: bool = False
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    owner_id: str
    file_name: str
    file_size_mb: float
    page_count: int = 0
    status: DocumentStatus = DocumentStatus.UPLOADING
    chroma_collection_id: Optional[str] = None
    mindmap: Optional[str] = None
    summary: Optional[str] = None
    quiz: Optional[List[dict]] = None
    study_questions: Optional[List[str]] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    session_id: Optional[str] = None
    role: str # 'user' or 'assistant'
    content: str
    sources: Optional[List[dict]] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    document_id: str
    title: str = "Cuộc trò chuyện mới"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    messages: List[ChatMessage] = []
