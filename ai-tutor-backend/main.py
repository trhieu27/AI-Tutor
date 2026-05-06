import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_db, close_db
from app.api import documents, chat, auth, users
from app.api.quota import quota_router
from app.api.notifications import notif_router, notification_manager


logger = logging.getLogger(__name__)
settings = get_settings()
settings.APP_VERSION = "1.0.2" # Fixed Model Names


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    os.makedirs("./storage", exist_ok=True)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
    await init_db()
    yield
    # Shutdown
    await close_db()
    logger.info("Shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI Tutor - RAG-powered document Q&A backend",
    lifespan=lifespan,
    redirect_slashes=False,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Routers
@app.middleware("http")
async def log_requests(request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logging.error(f"CRITICAL ERROR: {str(e)}")
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"detail": f"Backend Error: {str(e)}"}
        )

app.include_router(auth.router,           prefix="/api/v1")
app.include_router(documents.router,      prefix="/api/v1")
app.include_router(chat.router,           prefix="/api/v1")
app.include_router(users.router,          prefix="/api/v1")
app.include_router(quota_router,          prefix="/api/v1")
app.include_router(notif_router)          # REST: GET/PATCH/DELETE /api/v1/notifications

from fastapi import WebSocket, WebSocketDisconnect
import jwt
from jwt.exceptions import InvalidTokenError

@app.websocket("/api/v1/ws/notifications")
async def ws_notifications(websocket: WebSocket):
    """wss://host/api/v1/ws/notifications?token=<JWT>"""
    token = websocket.query_params.get("token", "")
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except InvalidTokenError:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await notification_manager.connect(user_id, websocket)
    try:
        await websocket.send_json({"type": "connected", "message": "WebSocket connected"})
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        notification_manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"[WS] Error for {user_id}: {e}")
        notification_manager.disconnect(user_id, websocket)


@app.get("/")
async def root():
    from datetime import datetime
    return {
        "status": "ok", 
        "app": settings.APP_NAME, 
        "version": settings.APP_VERSION,
        "updated_at": datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8081, reload=True)

