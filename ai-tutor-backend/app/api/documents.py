import os
import uuid
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db, db_container
from app.core.config import get_settings
from app.models.db_models import Document, DocumentStatus
from app.models.schemas import DocumentResponse
from app.rag import rag_engine

from app.api.auth import get_current_user
from app.api.quota import require_doc_quota
from app.api.notifications import notification_manager
from app.core.constants import DocNotif, ErrMsg, QuotaMsg

router = APIRouter(prefix="/documents", tags=["Documents"])
settings = get_settings()

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}


async def process_document_background(document_id: str, file_path: str, owner_id: str):
    """Background task: extract text and build ChromaDB index using MongoDB."""
    import logging
    logger = logging.getLogger(__name__)
    
    db = db_container.db
    doc_data = await db.documents.find_one({"id": document_id})
    if not doc_data:
        return

    try:
        await db.documents.update_one(
            {"id": document_id}, 
            {"$set": {"status": DocumentStatus.PROCESSING}}
        )

        collection_name, page_count = await rag_engine.ingest_document(file_path, document_id)

        await db.documents.update_one(
            {"id": document_id},
            {"$set": {
                "status": DocumentStatus.READY,
                "page_count": page_count,
                "chroma_collection_id": collection_name,
                "updated_at": datetime.utcnow()
            }}
        )
        logger.info(f"✅ Document {document_id} processed successfully")

        # 🔔 Gửi thông báo real-time cho user
        file_name = doc_data.get('file_name', '')
        await notification_manager.send_to_user(owner_id, {
            "type": "document_ready",
            "title": DocNotif.READY_TITLE,
            "message": DocNotif.READY_MSG.format(name=file_name),
            "document_id": document_id,
        })

    except Exception as e:
        logger.error(f"❌ Document {document_id} processing failed: {str(e)}")
        await db.documents.update_one(
            {"id": document_id},
            {"$set": {"status": DocumentStatus.FAILED}}
        )

        # 🔔 Gửi thông báo thất bại
        file_name = doc_data.get('file_name', '')
        await notification_manager.send_to_user(owner_id, {
            "type": "document_failed",
            "title": DocNotif.FAILED_TITLE,
            "message": DocNotif.FAILED_MSG.format(name=file_name),
            "document_id": document_id,
        })


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(require_doc_quota()),
):
    """Upload a PDF/DOC file and process it in the background using MongoDB."""
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Định dạng file không hỗ trợ. Chỉ chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}")

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=413, detail=f"File quá lớn. Tối đa {settings.MAX_FILE_SIZE_MB}MB.")

    document_id = str(uuid.uuid4())
    safe_name = f"{document_id}{suffix}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)

    document = Document(
        id=document_id,
        owner_id=current_user_id,
        file_name=file.filename or safe_name,
        file_size_mb=round(size_mb, 2),
        status=DocumentStatus.UPLOADING,
    )
    
    await db.documents.insert_one(document.dict())

    if suffix in [".pdf", ".docx", ".doc"]:
        background_tasks.add_task(process_document_background, document_id, file_path, current_user_id)
    else:
        await db.documents.update_one(
            {"id": document_id},
            {"$set": {"status": DocumentStatus.READY}}
        )

    return document


@router.post("/{document_id}/retry", response_model=DocumentResponse)
async def retry_document_processing(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """Manually trigger document processing for failed uploads."""
    doc = await db.documents.find_one({"id": document_id, "owner_id": current_user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại.")
        
    # Find the file on disk
    file_path = None
    for suffix in [".pdf", ".docx", ".doc"]:
        path = os.path.join(settings.UPLOAD_DIR, f"{document_id}{suffix}")
        if os.path.exists(path):
            file_path = path
            break
            
    if not file_path:
        raise HTTPException(status_code=400, detail="Không tìm thấy file tài liệu trên server.")

    # Reset status and trigger background task
    await db.documents.update_one(
        {"id": document_id},
        {"$set": {"status": DocumentStatus.PROCESSING}}
    )
    
    background_tasks.add_task(process_document_background, document_id, file_path)
    
    # Return updated doc
    doc["status"] = DocumentStatus.PROCESSING
    return doc


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """List all documents for the current user from MongoDB."""
    cursor = db.documents.find({"owner_id": current_user_id}).sort("uploaded_at", -1)
    docs = await cursor.to_list(length=100)
    return docs


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(    document_id: str, 
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """Get a single document by ID from MongoDB."""
    doc = await db.documents.find_one({"id": document_id, "owner_id": current_user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại.")
    return doc


@router.delete("/{document_id}", status_code=204)
async def delete_document(    document_id: str, 
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    """Delete a document and its associated data from MongoDB."""
    doc = await db.documents.find_one({"id": document_id, "owner_id": current_user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại.")

    if doc.get("chroma_collection_id"):
        try:
            import chromadb
            client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
            client.delete_collection(doc["chroma_collection_id"])
        except Exception:
            pass

    for suffix in [".pdf", ".doc", ".docx"]:
        fp = os.path.join(settings.UPLOAD_DIR, f"{document_id}{suffix}")
        if os.path.exists(fp):
            os.remove(fp)
            break

    await db.documents.delete_one({"id": document_id})
    await db.chat_sessions.delete_many({"document_id": document_id})
