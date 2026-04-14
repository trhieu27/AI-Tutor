from fastapi import APIRouter, Depends, HTTPException
import json
from uuid import uuid4
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.models.db_models import ChatSession, ChatMessage
from app.models.schemas import AskRequest, AskResponse, MessageResponse, ChatSessionResponse, ChatSessionDetail
from app.rag.rag_engine import ask_question, summarize_document, generate_quiz, generate_mindmap, generate_study_questions
from app.api.auth import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])



@router.post("/{document_id}/ask", response_model=AskResponse)
async def chat_with_document(
    document_id: str,
    request: AskRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """Ask a question using MongoDB and RAG."""
    # 1. Verify document exists
    doc = await db.documents.find_one({"id": document_id})
    if not doc or not doc.get("chroma_collection_id"):
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại hoặc chưa được xử lý")

    # 2. Get or create session
    session_id = request.session_id
    if not session_id:
        session_id = str(uuid4())
        new_session = ChatSession(
            id=session_id,
            user_id=current_user_id,
            document_id=document_id,
            title=request.question[:50] + "..."
        )
        await db.chat_sessions.insert_one(new_session.model_dump())
        session_data = new_session.model_dump()
    else:
        session_data = await db.chat_sessions.find_one({"id": session_id})
        if not session_data:
             raise HTTPException(status_code=404, detail="Phiên chat không tồn tại")
    
    # 3. Get history from the session document
    history_msgs = session_data.get("messages", [])
    chat_history = [{"role": m["role"], "content": m["content"]} for m in history_msgs]

    try:
        # 4. Ask RAG Engine
        rag_response = await ask_question(
            question=request.question,
            collection_name=doc["chroma_collection_id"],
            document_id=document_id,
            chat_history=chat_history
        )
        answer = rag_response.get("answer", "Xin lỗi, tôi không tìm được câu trả lời.")
        sources = rag_response.get("sources", [])

        # 5. Create message objects
        user_msg = ChatMessage(
            id=str(uuid4()),
            session_id=session_id,
            role="user",
            content=request.question,
            sources=[]
        ).model_dump()
        
        ai_msg = ChatMessage(
            id=str(uuid4()),
            session_id=session_id,
            role="assistant",
            content=answer,
            sources=sources
        ).model_dump()

        # 6. Update session in MongoDB (Append messages and update timestamp)
        await db.chat_sessions.update_one(
            {"id": session_id},
            {
                "$push": {"messages": {"$each": [user_msg, ai_msg]}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )

        return {
            "session_id": session_id,
            "message": ai_msg
        }
    except Exception as e:
        print(f"🔥 ERROR in MongoDB chat: {str(e)}")
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            raise HTTPException(status_code=429, detail="AI đang quá tải lượt dùng. Thử lại sau nhé.")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}/summarize")
async def get_summary(document_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.documents.find_one({"id": document_id})
    if not doc or not doc.get("chroma_collection_id"):
        raise HTTPException(status_code=404, detail="Tài liệu chưa sẵn sàng")
    
    try:
        summary = await summarize_document(doc["chroma_collection_id"])
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}/quiz")
async def get_document_quiz(document_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.documents.find_one({"id": document_id})
    if not doc or not doc.get("chroma_collection_id"):
        raise HTTPException(status_code=404, detail="Tài liệu chưa sẵn sàng")
    
    try:
        quiz = await generate_quiz(doc["chroma_collection_id"])
        return {"quiz": quiz}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}/mindmap")
async def get_document_mindmap(document_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db.documents.find_one({"id": document_id})
    if not doc or not doc.get("chroma_collection_id"):
        raise HTTPException(status_code=404, detail="Tài liệu chưa sẵn sàng")
    
    try:
        mindmap = await generate_mindmap(doc["chroma_collection_id"])
        return {"mindmap": mindmap}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    document_id: str, 
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    cursor = db.chat_sessions.find({"document_id": document_id, "user_id": current_user_id}).sort("updated_at", -1)
    sessions = await cursor.to_list(length=100)
    # Map messages to message_count for response schema
    for s in sessions:
        s["message_count"] = len(s.get("messages", []))
    return sessions

@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
async def get_session_detail(
    session_id: str, 
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    session = await db.chat_sessions.find_one({"id": session_id, "user_id": current_user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")
    
    # Add session_id to messages in the response
    for m in session.get("messages", []):
        m["session_id"] = session_id
    
    session["message_count"] = len(session.get("messages", []))
    return session

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str, 
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    result = await db.chat_sessions.delete_one({"id": session_id, "user_id": current_user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Không thể xóa phiên chat")
    return {"status": "success"}
