import os
import json
import re
import logging
import asyncio
import fitz  # PyMuPDF
import docx2txt
from typing import List, Tuple, Dict, Any, Optional

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

def _extract_text(content: Any) -> str:
    """Helper to extract plain text from LLM response which could be str or list of dicts."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join([part.get("text", "") if isinstance(part, dict) else str(part) for part in content])
    return str(content)


settings = get_settings()

# Ensure directories exist
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


_embeddings = None
_llm = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=settings.GEMINI_API_KEY,
        )
    return _embeddings


def get_llm():
    global _llm
    if _llm is None:
        _llm = ChatGoogleGenerativeAI(
            model="gemini-flash-latest",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.2,
        )
    return _llm


def extract_text_from_pdf(file_path: str) -> tuple[list[str], int]:
    """Extract text from PDF, return (list of page texts, page_count)."""
    doc = fitz.open(file_path)
    pages = []
    for page in doc:
        text = page.get_text()
        if text.strip():
            pages.append(text)
    page_count = len(doc)
    doc.close()
    return pages, page_count


def extract_text_from_docx(file_path: str) -> tuple[list[str], int]:
    """Extract text from DOCX, return (list containing whole text, page_count estimate)."""
    import docx2txt
    text = docx2txt.process(file_path)
    if not text.strip():
        return [], 0
    # DOCX doesn't have native pages in text extraction, 
    # treat as one large page or split by rough length
    pages = [text]
    # Estimate pages based on word count
    page_count = (len(text.split()) // 500) + 1
    return pages, page_count


async def ingest_document(file_path: str, document_id: str) -> tuple[str, int]:
    """
    Process a document file async.
    """
    import asyncio
    
    suffix = os.path.splitext(file_path)[1].lower()
    
    # Run text extraction in a thread to avoid blocking loop
    if suffix == ".pdf":
        pages, page_count = await asyncio.to_thread(extract_text_from_pdf, file_path)
    elif suffix in [".docx", ".doc"]:
        pages, page_count = await asyncio.to_thread(extract_text_from_docx, file_path)
    else:
        raise ValueError(f"Định dạng tệp {suffix} không được hỗ trợ xử lý nội dung.")

    if not pages:
        raise ValueError("Không thể trích xuất văn bản từ tài liệu.")

    # Split text into chunks with metadata
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )

    chunks = []
    chunk_metadatas = []
    for i, page_text in enumerate(pages, 1):
        text_chunks = splitter.split_text(page_text)
        for chunk in text_chunks:
            chunks.append(chunk)
            chunk_metadatas.append({"document_id": document_id, "page": i})

    # Create a unique collection name per document
    collection_name = f"doc_{document_id.replace('-', '_')}"

    # Store in ChromaDB - This is blocking, run in thread
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
    embeddings = get_embeddings()
    return Chroma(
        collection_name=collection_name,
        embedding_function=embeddings,
        persist_directory=settings.CHROMA_PERSIST_DIR,
    )


def build_chat_history(messages: list[dict]) -> list:
    """Convert stored messages to LangChain message format, limiting to last 6 messages."""
    history = []
    # Only take last 6 messages to save memory and context window
    for msg in messages[-6:]:
        if msg["role"] == "user":
            history.append(HumanMessage(content=msg["content"]))
        else:
            history.append(AIMessage(content=msg["content"]))
    return history


async def ask_question(
    question: str,
    collection_name: str,
    document_id: str,
    chat_history: list[dict],
) -> dict:
    """
    Ask a question using RAG with LCEL.
    Returns {'answer': str, 'sources': list[dict]}
    """
    import asyncio
    import gc
    try:
        vectorstore = await asyncio.to_thread(get_vectorstore, collection_name)
        retrieved_docs = await vectorstore.asimilarity_search(question, k=5)
        
        # Free memory reference to vectorstore early if possible
        # (Though we still need it for context, but we can call gc)
        gc.collect() 

        llm = get_llm()

        # Build prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_TEMPLATE_CHAT),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}"),
        ])

        # Format context
        context_text = "\n\n---\n\n".join([doc.page_content for doc in retrieved_docs])

        # Build LangChain history
        lc_history = build_chat_history(chat_history)

        # Create chain using LCEL
        chain = prompt | llm | StrOutputParser()

        answer = await chain.ainvoke({
            "context": context_text,
            "chat_history": lc_history,
            "question": question,
        })
        
        # Format sources
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
        # Raise the exception so the API layer can handle it with proper HTTP codes
        raise e


async def summarize_document(collection_name: str) -> str:
    """Generate a comprehensive summary of the document."""
    try:
        vectorstore = await asyncio.to_thread(get_vectorstore, collection_name)
        
        # Check if collection has any data
        try:
            count = vectorstore._collection.count()
            if count == 0:
                return "Tài liệu chưa được xử lý. Vui lòng tải lên lại."
        except Exception:
            return "Không tìm thấy dữ liệu tài liệu."

        docs = await vectorstore.asimilarity_search(QUERY_SUMMARIZE, k=10) 
        
        if not docs:
            return "Không tìm thấy nội dung để tóm tắt."
        
        context = "\n\n".join([doc.page_content for doc in docs])
        
        llm = get_llm()
        prompt = PROMPT_SUMMARIZE.replace("{context}", context)
        response = await llm.ainvoke(prompt)
        return _extract_text(response.content).strip()
    except Exception as e:
        if "429" in str(e):
            return "AI đang bận, vui lòng thử lại sau vài giây."
        raise e


async def generate_quiz(collection_name: str) -> list[dict]:
    """Generate multiple choice questions from the document."""
    try:
        vectorstore = await asyncio.to_thread(get_vectorstore, collection_name)
        # Search for key concepts across the whole document
        docs = await vectorstore.asimilarity_search(QUERY_QUIZ, k=50)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        if not context.strip():
            return []

        llm = get_llm()
        prompt = PROMPT_QUIZ.replace("{context}", context)
        # Tell LLM to generate enough questions for the whole content
        prompt += "\n\nYÊU CẦU: Hãy tạo số lượng câu hỏi phù hợp (từ 10-30 câu) để bao quát toàn bộ các nội dung quan trọng có trong văn bản trên."

        response = await llm.ainvoke(prompt)
        content = _extract_text(response.content).strip()
        
        # Use regex to find the first JSON-like array []
        import re
        import json
        json_match = re.search(r'\[\s*\{.*\}\s*\]', content, re.DOTALL)
        if json_match:
            content = json_match.group(0)
        else:
            # Fallback for simple cleaning
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
        
        quiz_data = json.loads(content)
        logger.info(f"Successfully generated {len(quiz_data)} questions")
        return quiz_data if isinstance(quiz_data, list) else []
        
    except Exception as e:
        logging.error(f"ERROR in generate_quiz: {str(e)}")
        raise e


async def generate_mindmap(collection_name: str) -> str:
    """Generate a Mermaid.js mindmap string of the document."""
    try:
        vectorstore = await asyncio.to_thread(get_vectorstore, collection_name)
        docs = await vectorstore.asimilarity_search(QUERY_MINDMAP, k=10)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        llm = get_llm()
        prompt = PROMPT_MINDMAP.replace("{context}", context)

        response = await llm.ainvoke(prompt)
        content = _extract_text(response.content).strip()
        # Ensure it starts with mindmap and remove markdown
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("mermaid"):
                content = content[7:]
        return content.strip()
    except Exception as e:
        print(f"🔥 ERROR in generate_mindmap: {str(e)}")
        raise e


async def generate_study_questions(collection_name: str) -> list[str]:
    """Generate 10 open-ended study questions for the document."""
    try:
        vectorstore = await asyncio.to_thread(get_vectorstore, collection_name)
        docs = await vectorstore.asimilarity_search(QUERY_STUDY_QUESTIONS, k=15)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        llm = get_llm()
        prompt = PROMPT_STUDY_QUESTIONS.replace("{context}", context)

        response = await llm.ainvoke(prompt)
        content = _extract_text(response.content).strip()
        lines = content.split('\n')
        questions = [line.strip().lstrip('0123456789.- ').strip('"') for line in lines if '?' in line]
        return questions[:10]
    except Exception as e:
        print(f"🔥 ERROR in generate_study_questions: {str(e)}")
        raise e
