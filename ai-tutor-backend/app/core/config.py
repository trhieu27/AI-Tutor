from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Tutor Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Google Gemini API
    GEMINI_API_KEY: str = ""

    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./storage/chroma_db"
    CHROMA_COLLECTION_NAME: str = "ai_tutor_docs"

    # File Upload
    UPLOAD_DIR: str = "./storage/uploads"
    MAX_FILE_SIZE_MB: int = 50

    # SQLite (for history)
    DATABASE_URL: str = "sqlite+aiosqlite:///d:/DoAn/ai-tutor-backend/storage/ai_tutor.db"

    # AWS (S3 for file storage, etc.)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-southeast-1"
    AWS_S3_BUCKET_NAME: str = "ai-tutor-storage"

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
