from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
from uuid import uuid4
from datetime import datetime

from app.core.database import get_db
from app.models.db_models import ChatSession, ChatMessage, Document
from app.models.schemas import AskRequest, AskResponse, MessageResponse, ChatSessionResponse, ChatSessionDetail
from app.rag.rag_engine import ask_question, summarize_document, generate_quiz, generate_mindmap, generate_study_questions

router = APIRouter(prefix="/chat", tags=["Chat"])

DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"

@router.post("/{document_id}/ask", response_model=AskResponse)
async def chat_with_document(
    document_id: str,
    request: AskRequest,
    db: AsyncSession = Depends(get_db)
):
    """Ask a question about a specific document."""
    # 1. Verify document exists
    doc_result = await db.execute(select(Document).where(Document.id == document_id))
    doc = doc_result.scalar_one_or_none()
    if not doc or not doc.chroma_collection_id:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại hoặc chưa được xử lý")

    # 2. Get or create session
    session_id = request.session_id
    if not session_id:
        session_id = str(uuid4())
        new_session = ChatSession(
            id=session_id,
            user_id=DEMO_USER_ID,
            document_id=document_id,
            title=request.question[:50] + "..."
        )
        db.add(new_session)
        await db.commit()
    
    # 3. Get history for context
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    history_msgs = history_result.scalars().all()
    chat_history = [{"role": m.role, "content": m.content} for m in history_msgs]

    try:
        # 4. Ask RAG Engine
        rag_response = await ask_question(
            question=request.question,
            collection_name=doc.chroma_collection_id,
            document_id=document_id,
            chat_history=chat_history
        )
        answer = rag_response.get("answer", "Xin lỗi, tôi không tìm được câu trả lời.")
        sources = rag_response.get("sources", [])

        # 5. Save messages
        user_msg = ChatMessage(
            id=str(uuid4()),
            session_id=session_id,
            role="user",
            content=request.question,
            sources=json.dumps([])
        )
        ai_msg = ChatMessage(
            id=str(uuid4()),
            session_id=session_id,
            role="assistant",
            content=answer,
            sources=json.dumps(sources)
        )
        db.add(user_msg)
        db.add(ai_msg)
        
        # Update session timestamp
        session_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        session = session_result.scalar_one_or_none()
        if session:
            session.updated_at = datetime.utcnow()
        
        await db.commit()

        # Return in proper AskResponse structure matching schemas.py
        return {
            "session_id": session_id,
            "message": {
                "id": ai_msg.id,
                "session_id": session_id,
                "role": "assistant",
                "content": answer,
                "sources": sources,
                "created_at": ai_msg.created_at
            }
        }
    except Exception as e:
        print(f"🔥 ERROR in chat_with_document: {str(e)}")
        await db.rollback()
        
        # Return friendly message for quota exhaustion
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            raise HTTPException(
                status_code=429, 
                detail="Hệ thống đang bận hoặc quá tải lượt dùng. Vui lòng thử lại sau giây lát nhé."
            )
            
        raise HTTPException(status_code=500, detail="Đã xảy ra lỗi không xác định khi xử lý câu hỏi. Vui lòng thử lại sau.")

@router.get("/{document_id}/summarize")
async def get_summary(document_id: str, db: AsyncSession = Depends(get_db)):
    """Generate and return a summary of the document."""
    doc_result = await db.execute(select(Document).where(Document.id == document_id))
    doc = doc_result.scalar_one_or_none()
    if not doc or not doc.chroma_collection_id:
        raise HTTPException(status_code=404, detail="Tài liệu chưa sẵn sàng")
    
    try:
        summary = await summarize_document(doc.chroma_collection_id)
        return {"summary": summary}
    except Exception as e:
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            raise HTTPException(status_code=429, detail="AI đang bận hoặc quá tải lượt dùng. Vui lòng thử lại sau vài giây.")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo tóm tắt: {str(e)}")

@router.get("/{document_id}/quiz")
async def get_document_quiz(document_id: str, db: AsyncSession = Depends(get_db)):
    """Generate 5 quiz questions for the document."""
    try:
        print(f"🧩 DEBUG: Requesting quiz for document: {document_id}")
        doc_result = await db.execute(select(Document).where(Document.id == document_id))
        doc = doc_result.scalar_one_or_none()
        
        if not doc:
            print(f"❌ DEBUG: Document {document_id} not found in DB.")
            raise HTTPException(status_code=404, detail="Tài liệu không tồn tại")
            
        if not doc.chroma_collection_id:
            print(f"⚠️ DEBUG: Document {document_id} has no Chroma collection ID. Status: {doc.status}")
            raise HTTPException(status_code=404, detail="Dữ liệu tài liệu chưa sẵn sàng để tạo quiz")
        
        print(f"🧠 DEBUG: Invoking generate_quiz for collection: {doc.chroma_collection_id}")
        quiz = await generate_quiz(doc.chroma_collection_id)
        
        if not quiz:
            print("⚠️ DEBUG: generate_quiz returned an empty list.")
            return {"quiz": []}
            
        print(f"✅ DEBUG: Successfully generated {len(quiz)} quiz questions.")
        return {"quiz": quiz}
    except Exception as e:
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            raise HTTPException(status_code=429, detail="AI đang bận hoặc quá tải lượt dùng. Vui lòng thử lại sau vài giây.")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo bài kiểm tra: {str(e)}")

@router.get("/{document_id}/mindmap")
async def get_document_mindmap(document_id: str, db: AsyncSession = Depends(get_db)):
    """Generate a Mermaid.js mindmap for the document."""
    doc_result = await db.execute(select(Document).where(Document.id == document_id))
    doc = doc_result.scalar_one_or_none()
    if not doc or not doc.chroma_collection_id:
        raise HTTPException(status_code=404, detail="Tài liệu chưa sẵn sàng")
    
    try:
        mindmap = await generate_mindmap(doc.chroma_collection_id)
        return {"mindmap": mindmap}
    except Exception as e:
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            raise HTTPException(status_code=429, detail="AI đang bận hoặc quá tải lượt dùng. Vui lòng thử lại sau vài giây.")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo sơ đồ tư duy: {str(e)}")


@router.get("/{document_id}/study-questions")
async def get_document_study_questions(document_id: str, db: AsyncSession = Depends(get_db)):
    """Generate 10 open-ended study questions for the document."""
    doc_result = await db.execute(select(Document).where(Document.id == document_id))
    doc = doc_result.scalar_one_or_none()
    if not doc or not doc.chroma_collection_id:
        raise HTTPException(status_code=404, detail="Tài liệu chưa sẵn sàng")
    
    try:
        questions = await generate_study_questions(doc.chroma_collection_id)
        return {"questions": questions}
    except Exception as e:
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            raise HTTPException(status_code=429, detail="AI đang bận hoặc quá tải lượt dùng. Vui lòng thử lại sau vài giây.")
        raise HTTPException(status_code=500, detail=f"Lỗi khi tạo câu hỏi ôn tập: {str(e)}")

@router.get("/{document_id}/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(document_id: str, db: AsyncSession = Depends(get_db)):
    """List all chat sessions for a document that belong to the current user."""
    result = await db.execute(
        select(ChatSession)
        .where(
            ChatSession.document_id == document_id,
            ChatSession.user_id == DEMO_USER_ID
        )
        .order_by(ChatSession.updated_at.desc())
    )
    return result.scalars().all()

@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
async def get_session_detail(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get full details and message history of a session for the current user."""
    try:
        # First find the session by ID only
        session_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        session = session_result.scalar_one_or_none()
        
        if not session:
            print(f"❌ DEBUG: Session {session_id} NOT FOUND in database.")
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")
        
        # Check ownership
        if session.user_id != DEMO_USER_ID:
            print(f"❌ DEBUG: Session {session_id} belongs to user '{session.user_id}', not '{DEMO_USER_ID}'")
            # If the user changed from 'demo_user' string to UUID, handle it
            if session.user_id != 'demo_user' and session.user_id.strip() != DEMO_USER_ID.strip():
                 raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập phiên chat này")
        
        history_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        messages = history_result.scalars().all()
        
        # Parse 'sources' from JSON string to list for each message
        formatted_messages = []
        import json
        for msg in messages:
            msg_dict = {
                "id": msg.id,
                "session_id": msg.session_id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at,
                "sources": json.loads(msg.sources) if msg.sources else []
            }
            formatted_messages.append(msg_dict)
        
        # Explicitly build the response object to match ChatSessionDetail schema
        return {
            "id": session.id,
            "user_id": session.user_id,
            "document_id": session.document_id,
            "title": session.title,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": len(formatted_messages),
            "messages": formatted_messages
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"🔥 CRITICAL ERROR in get_session_detail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a chat session owned by the current user."""
    # Verify ownership
    session_result = await db.execute(
        select(ChatSession)
        .where(ChatSession.id == session_id, ChatSession.user_id == DEMO_USER_ID)
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Phiên chat không tồn tại hoặc không thuộc quyền sở hữu của bạn")

    # Delete messages first
    from sqlalchemy import delete
    await db.execute(delete(ChatMessage).where(ChatMessage.session_id == session_id))
    await db.execute(delete(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == DEMO_USER_ID))
    await db.commit()
    return {"status": "success"}
