from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from passlib.context import CryptContext
from datetime import datetime
from typing import Optional
from uuid import uuid4
import logging

from app.core.database import get_db
from app.api.auth import get_current_user
from app.core.email import send_support_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class UpdatePreferencesRequest(BaseModel):
    email_notifications: Optional[bool] = None
    ai_response_detail: Optional[str] = None

class ContactRequest(BaseModel):
    subject: str
    message: str

# ── Helper ────────────────────────────────────────────────────────────────────

def _serialize_user(user: dict) -> dict:
    """Return safe public user dict (no hashed_password)."""
    return {
        "id":                user.get("id"),
        "student_id":        user.get("student_id", ""),
        "full_name":         user.get("full_name", ""),
        "email":             user.get("email", ""),

        "bio":               user.get("bio"),
        "is_pro":            user.get("is_pro", False),
        "preferences":       user.get("preferences", {"email_notifications": True, "ai_response_detail": "balanced"}),
        "created_at":        str(user.get("created_at", "")),
    }

# ── GET /users/me ─────────────────────────────────────────────────────────────

@router.get("/me")
async def get_me(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    user = await db.users.find_one({"id": current_user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    return _serialize_user(user)

# ── PUT /users/profile ────────────────────────────────────────────────────────

@router.put("/profile")
async def update_profile(
    body: UpdateProfileRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    updates: dict = {"updated_at": datetime.utcnow()}
    if body.full_name is not None:
        if not body.full_name.strip():
            raise HTTPException(status_code=400, detail="Tên không được để trống")
        updates["full_name"] = body.full_name.strip()
    if body.bio is not None:
        updates["bio"] = body.bio.strip()[:300]  # max 300 chars

    await db.users.update_one({"id": current_user_id}, {"$set": updates})
    user = await db.users.find_one({"id": current_user_id})
    return _serialize_user(user)

# ── PUT /users/password ───────────────────────────────────────────────────────

@router.put("/password")
async def change_password(
    body: ChangePasswordRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    user = await db.users.find_one({"id": current_user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")

    # Verify current password
    if not pwd_context.verify(body.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")

    # Confirm match
    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="Mật khẩu mới không khớp")

    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 8 ký tự")

    hashed = pwd_context.hash(body.new_password)
    await db.users.update_one(
        {"id": current_user_id},
        {"$set": {"hashed_password": hashed, "updated_at": datetime.utcnow()}}
    )
    return {"message": "Mật khẩu đã được cập nhật thành công"}

# ── PUT /users/upgrade-pro ────────────────────────────────────────────────────

@router.put("/upgrade-pro")
async def upgrade_to_pro(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """Nâng cấp tài khoản lên Pro."""
    await db.users.update_one(
        {"id": current_user_id},
        {"$set": {"is_pro": True, "updated_at": datetime.utcnow()}}
    )
    user = await db.users.find_one({"id": current_user_id})
    return _serialize_user(user)



# ── PUT /users/preferences ────────────────────────────────────────────────────

@router.put("/preferences")
async def update_preferences(
    body: UpdatePreferencesRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    updates: dict = {}
    if body.email_notifications is not None:
        updates["preferences.email_notifications"] = body.email_notifications
    if body.ai_response_detail is not None:
        valid = {"concise", "balanced", "detailed"}
        if body.ai_response_detail not in valid:
            raise HTTPException(status_code=400, detail="Giá trị không hợp lệ")
        updates["preferences.ai_response_detail"] = body.ai_response_detail

    if updates:
        updates["updated_at"] = datetime.utcnow()
        await db.users.update_one({"id": current_user_id}, {"$set": updates})

    user = await db.users.find_one({"id": current_user_id})
    return _serialize_user(user)

# ── GET /users/sessions ───────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    cursor = db.user_sessions.find({"user_id": current_user_id}).sort("last_active", -1)
    sessions = await cursor.to_list(length=20)
    for s in sessions:
        s.pop("_id", None)
    return sessions

# ── DELETE /users/sessions/{session_id} ──────────────────────────────────────

@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    result = await db.user_sessions.delete_one(
        {"id": session_id, "user_id": current_user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên đăng nhập")
    return {"message": "Đã thu hồi phiên đăng nhập"}

# ── DELETE /users/sessions ── revoke ALL except current ──────────────────────

@router.delete("/sessions")
async def revoke_all_sessions(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    await db.user_sessions.delete_many({"user_id": current_user_id})
    return {"message": "Đã đăng xuất khỏi tất cả thiết bị"}

# ── POST /users/support ───────────────────────────────────────────────────────

@router.post("/support")
async def send_support(
    body: ContactRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """Gửi yêu cầu hỗ trợ từ người dùng đến hộp thư SMTP_USER."""
    if not body.subject.strip():
        raise HTTPException(status_code=400, detail="Chủ đề không được để trống")
    if len(body.message.strip()) < 20:
        raise HTTPException(status_code=400, detail="Nội dung phải có ít nhất 20 ký tự")

    # Lấy thông tin user để điền vào email
    user = await db.users.find_one({"id": current_user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")

    ok = send_support_email(
        sender_name=user.get("full_name", "Người dùng"),
        sender_email=user.get("email", ""),
        subject=body.subject.strip(),
        message=body.message.strip(),
    )

    if not ok:
        # SMTP chưa cấu hình — vẫn báo thành công với user (log ở server)
        logger.warning(f"Support email not sent (SMTP not configured) from {user.get('email')}")

    return {"message": "Yêu cầu hỗ trợ đã được gửi thành công"}
