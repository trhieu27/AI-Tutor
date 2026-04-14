import certifi
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db_container = MongoDB()

async def get_db():
    """Dependency to get MongoDB database instance."""
    return db_container.db

async def init_db():
    """Initialize MongoDB connection on startup."""
    print(f"🔗 Connecting to MongoDB at {settings.MONGO_URL}...")
    try:
        # Use certifi for SSL/TLS certificate verification
        db_container.client = AsyncIOMotorClient(
            settings.MONGO_URL,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=5000  # 5 seconds timeout
        )
        db_container.db = db_container.client[settings.DATABASE_NAME]
        
        # Check connection health
        await db_container.client.admin.command('ping')
        print(f"✅ Connected to MongoDB: {settings.DATABASE_NAME}")
    except Exception as e:
        print(f"❌ DATABASE CONNECTION ERROR: {str(e)}")
        # We don't raise here to allow the app to start and show health check status
        # but the app might fail later if DB is required.

async def close_db():
    """Close MongoDB connection on shutdown."""
    if db_container.client:
        db_container.client.close()
        print("🔌 MongoDB connection closed")
