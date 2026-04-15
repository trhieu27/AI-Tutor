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
    logger.info("Connecting to MongoDB...")
    try:
        db_container.client = AsyncIOMotorClient(
            settings.MONGO_URL,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=5000
        )
        db_container.db = db_container.client[settings.DATABASE_NAME]
        await db_container.client.admin.command('ping')
        logger.info(f"Connected to MongoDB: {settings.DATABASE_NAME}")
    except Exception as e:
        logger.error(f"DATABASE CONNECTION ERROR: {str(e)}")

async def close_db():
    """Close MongoDB connection on shutdown."""
    if db_container.client:
        db_container.client.close()
        logger.info("MongoDB connection closed")
