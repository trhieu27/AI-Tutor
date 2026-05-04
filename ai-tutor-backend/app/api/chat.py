import re
import json
import logging
import asyncio
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from langchain_core.messages import HumanMessage, AIMessage

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.models.db_models import ChatSession, ChatMessage
from app.models.schemas import AskRequest, AskResponse, MessageResponse, ChatSessionResponse, ChatSessionDetail
from app.rag.rag_engine import (
    ask_question,
    summarize_document_stream,
    generate_quiz_stream,
    generate_mindmap_stream,
    generate_study_questions_stream,
)
from app.api.auth import get_current_user
from app.api.quota import require_chat_quota, check_and_record_ai_quota, FREE_LIMITS

router = APIRouter(prefix="/chat", tags=["Chat"])

# ── Prompt injection guard ────────────────────────────────────────────────────

_INJECTION_PATTERNS = re.compile(
    r"ignore (all |previous |above )?instructions?"
    r"|forget (everything|all|your instructions?)"
    r"|(reveal|output|print|show|display) (the |your )?(system |original )?prompt"
    r"|you are now"
    r"|act as (a |an )?(different|new)"
    r"|jailbreak"
    r"|DAN mode",
    re.IGNORECASE,
)

def sanitize_question(text: str) -> str:
    """Strip control chars và block prompt injection patterns."""
    # Strip non-printable control characters
    cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text).strip()
    if _INJECTION_PATTERNS.search(cleaned):
        raise HTTPException(
            status_code=400,
            detail="Câu hỏi chứa nội dung không hợp lệ. Vui lòng đặt câu hỏi khác."
        )
    return cleaned



@router.post("/{document_id}/ask", response_model=AskResponse)
async def chat_with_document(
    document_id: str,
    request: AskRequest,
    fastapi_request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(require_chat_quota()),
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
    
    # 3. Xây dựng context window theo tier
    user = await db.users.find_one({"id": current_user_id})
    is_pro = bool(user.get("is_pro")) if user else False

    history_msgs = session_data.get("messages", [])

    if is_pro:
        # Pro: toàn bộ lịch sử, không giới hạn
        context_msgs = history_msgs
        MAX_CHAR_PER_MSG = 4000   # giới hạn mềm per message cho Pro
    else:
        # Free: giới hạn theo FREE_LIMITS
        context_msgs  = history_msgs[-FREE_LIMITS["context_messages"]:]
        MAX_CHAR_PER_MSG = FREE_LIMITS["msg_chars"]

    chat_history = [
        (HumanMessage(content=m["content"][:MAX_CHAR_PER_MSG]) if m["role"] == "user" else AIMessage(content=m["content"][:MAX_CHAR_PER_MSG]))
        for m in context_msgs
    ]

    try:
        # 4. Sanitize + kiểm tra độ dài câu hỏi
        question_text = sanitize_question(request.question)
        if not is_pro and len(question_text) > FREE_LIMITS["question_chars"]:
            raise HTTPException(
                status_code=400,
                detail=f"Tài khoản miễn phí giới hạn câu hỏi tối đa {FREE_LIMITS['question_chars']} ký tự ({len(question_text)} đã nhập). "
                       f"Nâng cấp Pro để hỏi không giới hạn."
            )

        # 5. Ask RAG Engine
        rag_response = await ask_question(
            question=question_text,
            collection_name=doc["chroma_collection_id"],
            document_id=document_id,
            chat_history=chat_history,
            is_cancelled=fastapi_request.is_disconnected
        )
        answer = rag_response.get("answer", "Xin l\u1ed7i, t\u00f4i kh\u00f4ng t\u00ecm \u0111\u01b0\u1ee3c c\u00e2u tr\u1ea3 l\u1eddi.")
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
    except asyncio.CancelledError:
        # User cancelled, just propagate
        raise
    except Exception as e:
        error_str = str(e)
        # Catch quota/rate limit errors
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            raise HTTPException(status_code=429, detail="Bộ não AI hiện đang quá tải lượt dùng. Vui lòng thử lại sau giây lát nhé.")
        
        # General catch-all for other AI errors
        logger.error(f"Chat Error: {error_str}")
        raise HTTPException(status_code=500, detail="Hệ thống đang bận hoặc gặp lỗi xử lý. Vui lòng thử lại sau nhé.")

@router.get("/{document_id}/summarize")
async def get_summary(document_id: str, request: Request, db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": document_id})
    if not doc or not doc.get("chroma_collection_id"):
        raise HTTPException(status_code=404, detail="Tài liệu chưa sẵn sàng")
    
    # Cache check — không tốn quota
    if doc.get("summary"):
        async def stream_cached():
            yield doc["summary"]
        return StreamingResponse(stream_cached(), media_type="text/plain")
    
    # Cache miss — kiểm tra quota trước khi gọi AI
    await check_and_record_ai_quota(current_user_id, db)

    async def generate_and_cache():
        full_text = ""
        async for chunk in summarize_document_stream(doc["chroma_collection_id"], is_cancelled=request.is_disconnected):
            full_text += chunk
            yield chunk
        if full_text.strip():
            await db.documents.update_one({"id": document_id}, {"$set": {"summary": full_text}})

    return StreamingResponse(generate_and_cache(), media_type="text/plain")

@router.get("/{document_id}/quiz")
async def get_document_quiz(
    document_id: str,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
    force: bool = False
):
    doc = await db.documents.find_one({"id": document_id})
    if not doc or not doc.get("chroma_collection_id"):
        raise HTTPException(status_code=404, detail="Tài liệu chưa sẵn sàng")
    
    # Force: xóa cache cũ để AI tạo bộ câu hỏi mới
    if force:
        await db.documents.update_one({"id": document_id}, {"$unset": {"quiz": ""}})
    elif doc.get("quiz"):
        # Trả cache nếu không force — KHÔNG tốn quota
        async def stream_cached():
            import json
            yield json.dumps(doc["quiz"])
        return StreamingResponse(stream_cached(), media_type="application/json")
    
    # Cache miss — kiểm tra quota trước khi gọi AI
    await check_and_record_ai_quota(current_user_id, db)

    async def generate_and_cache():
        yield " " # Prime stream
        full_text = ""
        async for chunk in generate_quiz_stream(doc["chroma_collection_id"], is_cancelled=request.is_disconnected):
            full_text += chunk
            yield chunk
        
        if full_text.strip():
            try:
                clean_json = full_text.strip()
                if "```json" in clean_json:
                    clean_json = clean_json.split("```json")[1].split("```")[0]
                elif "```" in clean_json:
                    clean_json = clean_json.split("```")[1].split("```")[0]
                
                import json
                parsed_quiz = json.loads(clean_json)
                await db.documents.update_one({"id": document_id}, {"$set": {"quiz": parsed_quiz}})
            except Exception as e:
                logger.error(f"Failed to cache quiz: {e}")

    return StreamingResponse(generate_and_cache(), media_type="text/plain")

@router.get("/{document_id}/mindmap")
async def get_document_mindmap(
    document_id: str, 
    request: Request, 
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
    force: bool = False
):
    doc = await db.documents.find_one({"id": document_id})
    if not doc or not doc.get("chroma_collection_id"):
        raise HTTPException(status_code=404, detail="Tài liệu chưa sẵn sàng")
    
    # Cache check - skip if force is true
    if force:
        # Hard clear cache to force AI re-gen
        await db.documents.update_one({"id": document_id}, {"$unset": {"mindmap": ""}})
    elif doc.get("mindmap"):
        async def stream_cached():
            yield doc["mindmap"]
        return StreamingResponse(stream_cached(), media_type="text/plain")
    
    # Cache miss — kiểm tra quota trước khi gọi AI
    await check_and_record_ai_quota(current_user_id, db)

    async def generate_and_cache():
        yield " " # Prime stream
        full_text = ""
        async for chunk in generate_mindmap_stream(doc["chroma_collection_id"], is_cancelled=request.is_disconnected):
            full_text += chunk
            yield chunk
        print(f"\n===== MINDMAP RESULT =====\n{full_text}\n===== END MINDMAP =====\n")
        if full_text.strip():
            await db.documents.update_one({"id": document_id}, {"$set": {"mindmap": full_text}})

    return StreamingResponse(generate_and_cache(), media_type="text/plain")

@router.put("/{document_id}/mindmap")
async def update_document_mindmap(
    document_id: str, 
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """Save manual mindmap changes to DB."""
    try:
        body = await request.json()
        mindmap_code = body.get("mindmap_code")
        if not mindmap_code:
            raise HTTPException(status_code=400, detail="Thiếu mã sơ đồ tư duy")
        
        result = await db.documents.update_one(
            {"id": document_id, "owner_id": current_user_id},
            {"$set": {"mindmap": mindmap_code, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
             # Check if it was because it didn't exist or user doesn't own it
             doc = await db.documents.find_one({"id": document_id})
             if not doc:
                 raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
             if doc.get("owner_id") != current_user_id:
                 raise HTTPException(status_code=403, detail="Bạn không có quyền chỉnh sửa tài liệu này")
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Save Mindmap error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}/study-questions")
async def get_study_questions(document_id: str, request: Request, db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user)):
    doc = await db.documents.find_one({"id": document_id})
    if not doc or not doc.get("chroma_collection_id"):
        raise HTTPException(status_code=404, detail="Tài liệu chưa sẵn sàng")
    
    # Cache check — không tốn quota
    if doc.get("study_questions"):
        async def stream_cached():
            yield "\n".join(doc["study_questions"])
        return StreamingResponse(stream_cached(), media_type="text/plain")
    
    # Cache miss — kiểm tra quota trước khi gọi AI
    await check_and_record_ai_quota(current_user_id, db)

    async def generate_and_cache():
        yield " " # Prime stream
        full_text = ""
        async for chunk in generate_study_questions_stream(doc["chroma_collection_id"], is_cancelled=request.is_disconnected):
            full_text += chunk
            yield chunk
        
        if full_text.strip():
            # Parse lines for caching
            questions = [l.strip() for l in full_text.split("\n") if l.strip()]
            await db.documents.update_one({"id": document_id}, {"$set": {"study_questions": questions}})

    return StreamingResponse(generate_and_cache(), media_type="text/plain")

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
