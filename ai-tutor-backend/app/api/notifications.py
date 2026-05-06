"""
WebSocket + REST API Notification System
-----------------------------------------
Schema generic: dễ mở rộng cho document, payment, system, v.v.
- WebSocket: push real-time khi có sự kiện
- REST: lấy lịch sử, đánh dấu đã đọc, xóa
"""
import uuid
import logging
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from jose import jwt, JWTError
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.database import get_db
from app.api.auth import get_current_user

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(tags=["Notifications"])


# ── Notification Manager (WebSocket) ─────────────────────────────────────────

class NotificationManager:
    """Quản lý WebSocket connections theo user_id (multi-tab support)."""

    def __init__(self):
        self._connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections.setdefault(user_id, []).append(websocket)
        logger.info(f"[WS] {user_id} connected (tabs: {len(self._connections[user_id])})")

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self._connections:
            try:
                self._connections[user_id].remove(websocket)
            except ValueError:
                pass
            if not self._connections[user_id]:
                del self._connections[user_id]

    async def push(self, user_id: str, payload: dict):
        """Push đến tất cả tabs của user, tự dọn dead connections."""
        if user_id not in self._connections:
            return
        dead: List[WebSocket] = []
        for ws in self._connections[user_id]:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            try:
                self._connections[user_id].remove(ws)
            except ValueError:
                pass


notification_manager = NotificationManager()


# ── DB helpers ────────────────────────────────────────────────────────────────

def _build_notif_doc(
    user_id: str,
    notif_type: str,
    title: str,
    message: str,
    metadata: Optional[dict] = None,
) -> dict:
    """Tạo document thông báo generic, dễ mở rộng."""
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notif_type,          # document_ready | document_failed | payment_success | system | ...
        "title": title,
        "message": message,
        "is_read": False,
        "metadata": metadata or {},  # document_id, payment_id, amount, ...
        "created_at": datetime.utcnow().isoformat() + "Z",
    }


async def send_notification(
    user_id: str,
    notif_type: str,
    title: str,
    message: str,
    db: AsyncIOMotorDatabase,
    metadata: Optional[dict] = None,
):
    """
    Gửi thông báo: lưu MongoDB + push WebSocket (nếu online).
    Dùng function này ở mọi nơi cần thông báo (documents, payments, ...).
    """
    doc = _build_notif_doc(user_id, notif_type, title, message, metadata)
    await db.notifications.insert_one(doc)

    # Push real-time nếu user đang online
    await notification_manager.push(user_id, {
        "type": notif_type,
        "title": title,
        "message": message,
        "metadata": metadata or {},
        "created_at": doc["created_at"],
        "id": doc["id"],
    })

    logger.info(f"[Notif] {notif_type} → {user_id}")


# ── WebSocket Endpoint ────────────────────────────────────────────────────────

@router.websocket("/api/v1/ws/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    token: str = Query(...),
):
    """ws(s)://host/api/v1/ws/notifications?token=<JWT>"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except JWTError:
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


# ── REST API ──────────────────────────────────────────────────────────────────

notif_router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


@notif_router.get("")
async def get_notifications(
    limit: int = 30,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """Lấy lịch sử thông báo gần nhất (mới nhất trước)."""
    cursor = db.notifications.find(
        {"user_id": current_user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


@notif_router.patch("/read-all")
async def mark_all_read(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """Đánh dấu tất cả thông báo là đã đọc."""
    await db.notifications.update_many(
        {"user_id": current_user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"ok": True}


@notif_router.patch("/{notif_id}/read")
async def mark_one_read(
    notif_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """Đánh dấu một thông báo là đã đọc."""
    await db.notifications.update_one(
        {"id": notif_id, "user_id": current_user_id},
        {"$set": {"is_read": True}}
    )
    return {"ok": True}


@notif_router.delete("")
async def clear_notifications(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """Xóa toàn bộ lịch sử thông báo."""
    await db.notifications.delete_many({"user_id": current_user_id})
    return {"ok": True}
