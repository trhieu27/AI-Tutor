from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Tutor Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    GEMINI_API_KEY: str = ""

    # JWT
    JWT_SECRET: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 # 1 hour
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7 # 7 days

    # ChromaDB
    CHROMA_PERSIST_DIR: str = "./storage/chroma_db"
    CHROMA_COLLECTION_NAME: str = "ai_tutor_docs"

    # File Upload
    UPLOAD_DIR: str = "./storage/uploads"
    MAX_FILE_SIZE_MB: int = 50

    # MongoDB (for history and metadata)
    MONGO_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ai_tutor"

    # SMTP Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "" # Placeholder
    SMTP_PASSWORD: str = "" # Placeholder
    EMAILS_FROM_NAME: str = "AI Tutor Support"



    # CORS — Được override qua biến CORS_ORIGINS trong .env khi production
    # Ví dụ trong .env:
    # CORS_ORIGINS=["https://main.xxx.amplifyapp.com","https://yourdomain.com"]
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://192.168.4.175:3000",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
