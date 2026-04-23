import os
import re
import json
import logging
import asyncio
from functools import lru_cache
from typing import List, Tuple, Dict, Any, Optional

import fitz  # PyMuPDF
import docx2txt
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

from app.core.config import get_settings
from app.rag.texts import (
    SYSTEM_TEMPLATE_CHAT,
    QUERY_SUMMARIZE,
    QUERY_QUIZ,
    QUERY_MINDMAP,
    QUERY_STUDY_QUESTIONS,
    PROMPT_SUMMARIZE,
    PROMPT_QUIZ,
    PROMPT_MINDMAP,
    PROMPT_STUDY_QUESTIONS
)

logger = logging.getLogger(__name__)

settings = get_settings()

# Ensure directories exist
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


# ── Singleton LLM & Embeddings (thread-safe via lru_cache) ───────────────────

@lru_cache(maxsize=1)
def get_embeddings() -> GoogleGenerativeAIEmbeddings:
    return GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=get_settings().GEMINI_API_KEY,
    )


@lru_cache(maxsize=1)
def get_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model="gemini-flash-latest",
        google_api_key=get_settings().GEMINI_API_KEY,
        temperature=0.2,
        transport="rest",
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_text(content: Any) -> str:
    """Extract plain text from LLM response (str or list of dicts)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join([
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        ])
    return str(content)


def _stream_chunk_text(chunk) -> str:
    """Extract text from a streaming LLM chunk."""
    content = chunk.content
    if isinstance(content, list):
        return "".join([
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        ])
    return str(content)


# ── Document Ingestion ────────────────────────────────────────────────────────

def extract_text_from_pdf(file_path: str) -> tuple[list[str], int]:
    """Extract text from PDF, return (list of page texts, page_count)."""
    doc = fitz.open(file_path)
    pages = [page.get_text() for page in doc if page.get_text().strip()]
    page_count = len(doc)
    doc.close()
    return pages, page_count


def extract_text_from_docx(file_path: str) -> tuple[list[str], int]:
    """Extract text from DOCX, return (list containing whole text, page_count estimate)."""
    text = docx2txt.process(file_path)
    if not text.strip():
        return [], 0
    page_count = (len(text.split()) // 500) + 1
    return [text], page_count


async def ingest_document(file_path: str, document_id: str) -> tuple[str, int]:
    """Process a document file async."""
    suffix = os.path.splitext(file_path)[1].lower()

    if suffix == ".pdf":
        pages, page_count = await asyncio.to_thread(extract_text_from_pdf, file_path)
    elif suffix in [".docx", ".doc"]:
        pages, page_count = await asyncio.to_thread(extract_text_from_docx, file_path)
    else:
        raise ValueError(f"Định dạng tệp {suffix} không được hỗ trợ xử lý nội dung.")

    if not pages:
        raise ValueError("Không thể trích xuất văn bản từ tài liệu.")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )

    chunks = []
    chunk_metadatas = []
    for i, page_text in enumerate(pages, 1):
        for chunk in splitter.split_text(page_text):
            chunks.append(chunk)
            chunk_metadatas.append({"document_id": document_id, "page": i})

    collection_name = f"doc_{document_id.replace('-', '_')}"

    embeddings = get_embeddings()

    def _create_chroma():
        return Chroma.from_texts(
            texts=chunks,
            embedding=embeddings,
            metadatas=chunk_metadatas,
            collection_name=collection_name,
            persist_directory=settings.CHROMA_PERSIST_DIR,
        )

    await asyncio.to_thread(_create_chroma)
    return collection_name, page_count


def get_vectorstore(collection_name: str) -> Chroma:
    """Load an existing ChromaDB collection."""
    return Chroma(
        collection_name=collection_name,
        embedding_function=get_embeddings(),
        persist_directory=settings.CHROMA_PERSIST_DIR,
    )


# ── RAG Core ──────────────────────────────────────────────────────────────────

async def ask_question(
    question: str,
    collection_name: str,
    document_id: str,
    chat_history: list,       # Already LangChain HumanMessage/AIMessage objects from chat.py
    is_cancelled=None,
) -> dict:
    """
    Ask a question using RAG with LCEL.
    chat_history is expected to be a list of LangChain message objects,
    already filtered and truncated by chat.py according to user tier.
    Returns {'answer': str, 'sources': list[dict]}
    """
    try:
        vectorstore = await asyncio.to_thread(get_vectorstore, collection_name)
        retrieved_docs = await vectorstore.asimilarity_search(question, k=5)

        llm = get_llm()
        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_TEMPLATE_CHAT),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}"),
        ])

        context_text = "\n\n---\n\n".join([doc.page_content for doc in retrieved_docs])

        chain = prompt | llm | StrOutputParser()

        if is_cancelled and await is_cancelled():
            logger.info("⏹️ Connection disconnected before AI call.")
            raise asyncio.CancelledError()

        answer = await chain.ainvoke({
            "context": context_text,
            "chat_history": chat_history,
            "question": question,
        })

        # Deduplicate sources
        sources = []
        seen = set()
        for doc in retrieved_docs:
            page = doc.metadata.get("page", 0)
            excerpt = doc.page_content[:200].strip()
            key = (page, excerpt[:50])
            if key not in seen:
                seen.add(key)
                sources.append({
                    "document_id": document_id,
                    "page_number": page,
                    "text_excerpt": excerpt,
                })

        return {"answer": answer, "sources": sources[:3]}

    except Exception as e:
        raise e


# ── Streaming Generators ──────────────────────────────────────────────────────

async def summarize_document_stream(collection_name: str, is_cancelled=None):
    """Stream a comprehensive summary of the document."""
    try:
        vectorstore = await asyncio.to_thread(get_vectorstore, collection_name)
        docs = await vectorstore.asimilarity_search(QUERY_SUMMARIZE, k=10)
        if not docs:
            yield "Không tìm thấy nội dung để tóm tắt."
            return

        context = "\n\n".join([doc.page_content for doc in docs])
        prompt = PROMPT_SUMMARIZE.replace("{context}", context)

        async for chunk in get_llm().astream(prompt):
            if is_cancelled and await is_cancelled():
                logger.info("⏹️ Summary stream aborted by user.")
                break
            yield _stream_chunk_text(chunk)

    except Exception as e:
        logger.error(f"Summarize Stream Error: {e}")
        yield "\n\nHệ thống đang bận hoặc gặp lỗi xử lý. Vui lòng thử lại sau."


async def generate_quiz_stream(collection_name: str, is_cancelled=None):
    """Stream quiz JSON from the document."""
    try:
        vectorstore = await asyncio.to_thread(get_vectorstore, collection_name)
        docs = await vectorstore.asimilarity_search(QUERY_QUIZ, k=10)
        context = "\n\n".join([doc.page_content for doc in docs])

        prompt = PROMPT_QUIZ.replace("{context}", context)
        prompt += "\n\nYÊU CẦU quan trọng: Hãy trả về dữ liệu dưới dạng JSON array của các câu hỏi. Bắt đầu bằng [ và kết thúc bằng ]."

        async for chunk in get_llm().astream(prompt):
            if is_cancelled and await is_cancelled():
                break
            yield _stream_chunk_text(chunk)

    except Exception as e:
        logger.error(f"Quiz Stream Error: {e}")
        yield "[]"


async def generate_mindmap_stream(collection_name: str, is_cancelled=None):
    """Stream a Mermaid.js mindmap string."""
    try:
        vectorstore = await asyncio.to_thread(get_vectorstore, collection_name)
        docs = await vectorstore.asimilarity_search(QUERY_MINDMAP, k=10)
        context = "\n\n".join([doc.page_content for doc in docs])

        prompt = PROMPT_MINDMAP.replace("{context}", context)

        async for chunk in get_llm().astream(prompt):
            if is_cancelled and await is_cancelled():
                break
            yield _stream_chunk_text(chunk)

    except Exception as e:
        logger.error(f"Mindmap Stream Error: {e}")
        yield "Hệ thống đang bận hoặc gặp lỗi xử lý. Vui lòng thử lại sau giây lát hoặc kiểm tra lượt dùng AI."


async def generate_study_questions_stream(collection_name: str, is_cancelled=None):
    """Stream open-ended study questions."""
    try:
        vectorstore = await asyncio.to_thread(get_vectorstore, collection_name)
        docs = await vectorstore.asimilarity_search(QUERY_STUDY_QUESTIONS, k=15)
        context = "\n\n".join([doc.page_content for doc in docs])

        prompt = PROMPT_STUDY_QUESTIONS.replace("{context}", context)

        async for chunk in get_llm().astream(prompt):
            if is_cancelled and await is_cancelled():
                break
            yield _stream_chunk_text(chunk)

    except Exception as e:
        logger.error(f"Study Questions Stream Error: {e}")
        yield "\n\nHệ thống đang bận hoặc gặp lỗi xử lý. Vui lòng thử lại sau."
