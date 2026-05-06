"""
Rate limiting & quota enforcement for Free vs Pro users.

Free tier limits (per day, reset at midnight UTC):
  - documents:     max 3 total (không phải per day)
  - chat_messages: 30 / day
  - ai_features:   10 / day  (quiz, mindmap, summary, study_questions)

Pro tier: unlimited.
"""
from fastapi import Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from app.core.database import get_db
from app.api.auth import get_current_user

# ── Tunable limits ────────────────────────────────────────────────────────────

FREE_LIMITS = {
    "documents":        3,    # tổng số tài liệu (không reset theo ngày)
    "chat_messages":    30,   # tin nhắn chat / ngày
    "ai_features":      10,   # quiz + mindmap + summary + study_questions / ngày
    # Context window (không ghi usage_logs — áp dụng mỗi request)
    "context_messages": 6,    # số tin nhắn lịch sử gửi lên AI (3 lượt)
    "question_chars":   1200, # ký tự tối đa mỗi câu hỏi
    "msg_chars":        800,  # ký tự tối đa mỗi tin nhắn lịch sử
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _today_utc() -> str:
    """Trả chuỗi 'YYYY-MM-DD' theo UTC để làm key ngày."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def _get_user(user_id: str, db: AsyncIOMotorDatabase) -> dict:
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    return user


async def _usage_today(user_id: str, feature: str, db: AsyncIOMotorDatabase) -> int:
    """Đếm số lần dùng feature hôm nay từ collection usage_logs."""
    today = _today_utc()
    return await db.usage_logs.count_documents({
        "user_id": user_id,
        "feature": feature,
        "date":    today,
    })


async def _record_usage(user_id: str, feature: str, db: AsyncIOMotorDatabase):
    """Ghi 1 lần dùng feature vào usage_logs."""
    await db.usage_logs.insert_one({
        "user_id":    user_id,
        "feature":    feature,
        "date":       _today_utc(),
        "created_at": datetime.now(timezone.utc),
    })

# ── Public dependency factories ───────────────────────────────────────────────

def require_doc_quota():
    """
    Dependency: kiểm tra user free chưa vượt giới hạn số tài liệu.
    Dùng tại: POST /documents/upload
    """
    async def _check(
        db: AsyncIOMotorDatabase = Depends(get_db),
        current_user_id: str = Depends(get_current_user),
    ):
        user = await _get_user(current_user_id, db)
        if user.get("is_pro"):
            return current_user_id  # Pro → không giới hạn

        total = await db.documents.count_documents({"owner_id": current_user_id})
        limit = FREE_LIMITS["documents"]
        if total >= limit:
            raise HTTPException(
                status_code=402,
                detail=f"Tài khoản miễn phí chỉ được tải lên tối đa {limit} tài liệu. "
                       f"Nâng cấp Pro để không giới hạn."
            )
        return current_user_id
    return _check


def require_chat_quota():
    """
    Dependency: chỉ KIỂM TRA quota chat — KHÔNG ghi usage.
    Việc ghi usage được thực hiện sau khi AI trả lời thành công.
    Dùng tại: POST /chat/{id}/ask
    """
    async def _check(
        db: AsyncIOMotorDatabase = Depends(get_db),
        current_user_id: str = Depends(get_current_user),
    ):
        user = await _get_user(current_user_id, db)
        if user.get("is_pro"):
            return current_user_id

        used  = await _usage_today(current_user_id, "chat_messages", db)
        limit = FREE_LIMITS["chat_messages"]
        if used >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Bạn đã dùng hết {limit} tin nhắn miễn phí hôm nay. "
                       f"Nâng cấp Pro hoặc quay lại vào ngày mai."
            )
        # Không ghi usage ở đây — chỉ ghi sau khi AI trả lời thành công
        return current_user_id
    return _check


async def record_chat_usage(user_id: str, db: AsyncIOMotorDatabase):
    """
    Ghi 1 lượt chat vào usage_logs.
    Chỉ gọi sau khi AI đã trả lời thành công (tránh tính quota khi user hủy).
    """
    user = await _get_user(user_id, db)
    if user.get("is_pro"):
        return  # Pro → không giới hạn
    await _record_usage(user_id, "chat_messages", db)


def require_ai_quota():
    """
    Dependency: kiểm tra user free chưa vượt giới hạn AI feature hôm nay.
    Ghi usage sau khi check pass.
    Dùng tại: /summary, /quiz, /mindmap, /study-questions
    """
    async def _check(
        db: AsyncIOMotorDatabase = Depends(get_db),
        current_user_id: str = Depends(get_current_user),
    ):
        user = await _get_user(current_user_id, db)
        if user.get("is_pro"):
            return current_user_id

        used  = await _usage_today(current_user_id, "ai_features", db)
        limit = FREE_LIMITS["ai_features"]
        if used >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Bạn đã dùng hết {limit} lần tạo nội dung AI miễn phí hôm nay. "
                       f"Nâng cấp Pro hoặc quay lại vào ngày mai."
            )
        await _record_usage(current_user_id, "ai_features", db)
        return current_user_id
    return _check


async def check_and_record_ai_quota(user_id: str, db: AsyncIOMotorDatabase):
    """
    Kiểm tra + ghi quota AI thủ công.
    Gọi BÊN TRONG endpoint, SAU KHI đã kiểm tra cache.
    Chỉ tốn quota khi thực sự cần AI tạo mới nội dung.
    """
    user = await _get_user(user_id, db)
    if user.get("is_pro"):
        return  # Pro → không giới hạn

    used = await _usage_today(user_id, "ai_features", db)
    limit = FREE_LIMITS["ai_features"]
    if used >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Bạn đã dùng hết {limit} lần tạo nội dung AI miễn phí hôm nay. "
                   f"Nâng cấp Pro hoặc quay lại vào ngày mai."
        )
    await _record_usage(user_id, "ai_features", db)


# ── Endpoint để frontend lấy usage hiện tại ──────────────────────────────────

from fastapi import APIRouter

quota_router = APIRouter(prefix="/quota", tags=["Quota"])

@quota_router.get("/me")
async def get_my_quota(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """Trả về mức dùng hôm nay và giới hạn của user."""
    user = await _get_user(current_user_id, db)
    is_pro = bool(user.get("is_pro"))

    if is_pro:
        return {
            "is_pro": True,
            "limits": None,
            "usage":  None,
        }

    doc_count  = await db.documents.count_documents({"owner_id": current_user_id})
    chat_used  = await _usage_today(current_user_id, "chat_messages", db)
    ai_used    = await _usage_today(current_user_id, "ai_features", db)

    return {
        "is_pro": False,
        "limits": FREE_LIMITS,
        "usage": {
            "documents":     doc_count,
            "chat_messages": chat_used,
            "ai_features":   ai_used,
        },
    }
