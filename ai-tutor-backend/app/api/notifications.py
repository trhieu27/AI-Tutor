"""
WebSocket Notification System
------------------------------
- Mỗi user có thể có nhiều kết nối (multi-tab)
- Authentication bằng JWT token qua query param
- Auto-reconnect được xử lý ở phía client
- Notification types: document_ready, document_failed, system
"""
import logging
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(tags=["Notifications"])


# ── Notification Manager (singleton) ─────────────────────────────────────────

class NotificationManager:
    """Quản lý các WebSocket connections theo user_id."""

    def __init__(self):
        # user_id -> list of active WebSocket connections (multi-tab support)
        self._connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)
        logger.info(f"[WS] User {user_id} connected (tabs: {len(self._connections[user_id])})")

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self._connections:
            try:
                self._connections[user_id].remove(websocket)
            except ValueError:
                pass
            if not self._connections[user_id]:
                del self._connections[user_id]
        logger.info(f"[WS] User {user_id} disconnected")

    async def send_to_user(self, user_id: str, notification: dict):
        """Gửi notification đến tất cả tabs của user. Tự dọn connection chết."""
        if user_id not in self._connections:
            return
        dead: List[WebSocket] = []
        for ws in self._connections[user_id]:
            try:
                await ws.send_json(notification)
            except Exception:
                dead.append(ws)
        for ws in dead:
            try:
                self._connections[user_id].remove(ws)
            except ValueError:
                pass
        if dead:
            logger.info(f"[WS] Cleaned {len(dead)} dead connections for {user_id}")

    async def broadcast(self, notification: dict):
        """Gửi thông báo đến tất cả users đang kết nối."""
        for user_id in list(self._connections.keys()):
            await self.send_to_user(user_id, notification)


# Global singleton — import từ đây để dùng ở documents.py
notification_manager = NotificationManager()


# ── WebSocket Endpoint ────────────────────────────────────────────────────────

@router.websocket("/api/v1/ws/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    token: str = Query(..., description="JWT access token"),
):
    """
    WebSocket endpoint cho real-time notifications.
    URL: ws(s)://host/api/v1/ws/notifications?token=<JWT>
    """
    # 1. Xác thực token
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # 2. Kết nối
    await notification_manager.connect(user_id, websocket)

    try:
        # Gửi confirmation
        await websocket.send_json({
            "type": "connected",
            "message": "Kết nối thông báo thành công"
        })

        # 3. Keep-alive loop — client gửi "ping", server trả "pong"
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        notification_manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"[WS] Error for user {user_id}: {e}")
        notification_manager.disconnect(user_id, websocket)
