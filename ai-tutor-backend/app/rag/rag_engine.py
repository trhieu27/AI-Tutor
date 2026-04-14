import os
import json
import re
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

settings = get_settings()

# Ensure directories exist
os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def get_embeddings():
    return GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"),
    )


def get_llm():
    return ChatGoogleGenerativeAI(
        model="models/gemini-2.5-flash",
        google_api_key=settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"),
        temperature=0.3,
    )


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
    """Convert stored messages to LangChain message format."""
    history = []
    for msg in messages:
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
    try:
        print(f"🔍 DEBUG: Loading Vectorstore for collection: {collection_name}")
        # Run synchronous Chroma initialization in a thread
        vectorstore = await asyncio.to_thread(get_vectorstore, collection_name)
        
        print(f"🔍 DEBUG: Performing similarity search for: '{question}'")
        # Use asynchronous search for better performance
        retrieved_docs = await vectorstore.asimilarity_search(question, k=5)
        print(f"✅ DEBUG: Retrieved {len(retrieved_docs)} document chunks.")

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

        print(f"🚀 DEBUG: Invoking LLM chain for: {collection_name}")
        # Build payload
        payload = {
            "context": context_text,
            "chat_history": lc_history,
            "question": question,
        }
        
        answer = await chain.ainvoke(payload)
        print(f"✅ DEBUG: LLM successfully replied.")
        
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
        import traceback
        traceback.print_exc()
        print(f"❌ DEBUG: Error during RAG ask_question: {str(e)}")
        # Raise the exception so the API layer can handle it with proper HTTP codes
        raise e


async def summarize_document(collection_name: str) -> str:
    """Generate a comprehensive summary of the document."""
    try:
        print(f"📄 DEBUG: Loading vectorstore for summary: {collection_name}")
        vectorstore = get_vectorstore(collection_name)
        
        print(f"📄 DEBUG: Searching for summary context with query: '{QUERY_SUMMARIZE}'")
        # Get a good sample of the document content
        docs = await vectorstore.asimilarity_search(QUERY_SUMMARIZE, k=15) 
        print(f"📄 DEBUG: Found {len(docs)} chunks for summary.")
        
        if not docs:
            print("⚠️ DEBUG: No documents found for summary context.")
            return "Không tìm thấy nội dung để tóm tắt tài liệu này."

        context = "\n\n".join([doc.page_content for doc in docs])
        
        llm = get_llm()
        prompt = PROMPT_SUMMARIZE.replace("{context}", context)

        print("🚀 DEBUG: Invoking LLM for summary...")
        response = await llm.ainvoke(prompt)
        print("✅ DEBUG: Summary generated successfully.")
        return response.content
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"🔥 ERROR in summarize_document: {str(e)}")
        raise e


async def generate_quiz(collection_name: str) -> list[dict]:
    """Generate 5 multiple choice questions from the document."""
    try:
        print(f"🧠 DEBUG: Generating quiz for collection: {collection_name}")
        vectorstore = get_vectorstore(collection_name)
        # Search for key concepts using async search
        docs = await vectorstore.asimilarity_search(QUERY_QUIZ, k=25)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        if not context.strip():
            print("⚠️ DEBUG: No context found for quiz generation.")
            return []

        llm = get_llm()
        prompt = PROMPT_QUIZ.replace("{context}", context)

        response = await llm.ainvoke(prompt)
        content = response.content.strip()
        
        # Clean response in case LLM adds markdown wrappers
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        print(f"✅ DEBUG: Quiz generated, length of content: {len(content)}")
        quiz_data = json.loads(content)
        return quiz_data if isinstance(quiz_data, list) else []
        
    except Exception as e:
        print(f"🔥 ERROR in generate_quiz: {str(e)}")
        raise e


async def generate_mindmap(collection_name: str) -> str:
    """Generate a Mermaid.js mindmap string of the document."""
    try:
        vectorstore = get_vectorstore(collection_name)
        docs = await vectorstore.asimilarity_search(QUERY_MINDMAP, k=10)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        llm = get_llm()
        prompt = PROMPT_MINDMAP.replace("{context}", context)

        response = await llm.ainvoke(prompt)
        content = response.content.strip()
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
        vectorstore = get_vectorstore(collection_name)
        docs = await vectorstore.asimilarity_search(QUERY_STUDY_QUESTIONS, k=15)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        llm = get_llm()
        prompt = PROMPT_STUDY_QUESTIONS.replace("{context}", context)

        response = await llm.ainvoke(prompt)
        content = response.content.strip()
        lines = content.split('\n')
        questions = [line.strip().lstrip('0123456789.- ').strip('"') for line in lines if '?' in line]
        return questions[:10]
    except Exception as e:
        print(f"🔥 ERROR in generate_study_questions: {str(e)}")
        raise e
