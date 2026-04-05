import os
import uuid
import json
import shutil
import asyncio
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_db
from app.core.config import get_settings
from app.models.db_models import Document, DocumentStatus
from app.models.schemas import DocumentResponse
from app.rag import rag_engine

router = APIRouter(prefix="/documents", tags=["Documents"])
settings = get_settings()

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"  # Matches User ID seeded in seed_user.py


async def process_document_background(document_id: str, file_path: str):
    """Background task: extract text and build ChromaDB index."""
    from app.core.database import AsyncSessionLocal
    from app.models.db_models import Document, DocumentStatus

    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, document_id)
        if not doc:
            return

        try:
            doc.status = DocumentStatus.PROCESSING
            await db.commit()

            collection_name, page_count = await rag_engine.ingest_document(file_path, document_id)

            doc.status = DocumentStatus.READY
            doc.page_count = page_count
            doc.chroma_collection_id = collection_name
            await db.commit()

        except Exception as e:
            doc.status = DocumentStatus.FAILED
            await db.commit()
            print(f"[ERROR] Failed to process document {document_id}: {e}")


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF/DOC file and process it in the background."""
    # Validate extension
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Định dạng file không hỗ trợ. Chỉ chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}")

    # Read content & check size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=413, detail=f"File quá lớn. Tối đa {settings.MAX_FILE_SIZE_MB}MB.")

    # Create document record
    document_id = str(uuid.uuid4())
    safe_name = f"{document_id}{suffix}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)

    # Save file to disk
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)

    # Save to DB
    document = Document(
        id=document_id,
        owner_id=DEMO_USER_ID,
        file_name=file.filename or safe_name,
        file_size_mb=round(size_mb, 2),
        status=DocumentStatus.UPLOADING,
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Trigger background processing (PDF and DOC/DOCX supported)
    if suffix in [".pdf", ".docx", ".doc"]:
        background_tasks.add_task(process_document_background, document_id, file_path)
    else:
        # For other formats, mark as ready without RAG
        document.status = DocumentStatus.READY
        await db.commit()

    return document


@router.get("", response_model=list[DocumentResponse])
async def list_documents(db: AsyncSession = Depends(get_db)):
    """List all documents for the current user."""
    print("📥 GET /api/v1/documents/ called")
    result = await db.execute(
        select(Document)
        .where(Document.owner_id == DEMO_USER_ID)
        .order_by(Document.uploaded_at.desc())
    )
    docs = result.scalars().all()
    print(f"📤 Returning {len(docs)} documents")
    return docs


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single document by ID."""
    doc = await db.get(Document, document_id)
    if not doc or doc.owner_id != DEMO_USER_ID:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại.")
    return doc


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a document and its associated data."""
    doc = await db.get(Document, document_id)
    if not doc or doc.owner_id != DEMO_USER_ID:
        raise HTTPException(status_code=404, detail="Tài liệu không tồn tại.")

    # Delete from ChromaDB if indexed
    if doc.chroma_collection_id:
        try:
            import chromadb
            client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
            client.delete_collection(doc.chroma_collection_id)
        except Exception:
            pass  # Don't fail if collection doesn't exist

    # Delete uploaded file
    for suffix in [".pdf", ".doc", ".docx"]:
        fp = os.path.join(settings.UPLOAD_DIR, f"{document_id}{suffix}")
        if os.path.exists(fp):
            os.remove(fp)
            break

    await db.delete(doc)
    await db.commit()
