from datetime import datetime, timedelta
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

class RateLimiter:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.rate_limits

    async def check_limit(self, key: str, max_attempts: int = 5, lock_minutes: int = 1):
        """
        Kiểm tra xem một key (email/IP) có đang bị khóa không.
        Nếu sai quá max_attempts, ném ra lỗi HTTPException.
        """
        now = datetime.utcnow()
        record = await self.collection.find_one({"key": key})

        if record:
            # Nếu đang bị khóa
            if record.get("locked_until") and now < record["locked_until"]:
                seconds_left = int((record["locked_until"] - now).total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Thử quá nhiều lần. Vui lòng thử lại sau {seconds_left} giây."
                )
            
            # Nếu đã hết hạn khóa, reset lại
            if record.get("locked_until") and now >= record["locked_until"]:
                await self.collection.update_one(
                    {"key": key},
                    {"$set": {"attempts": 0, "locked_until": None}}
                )

        return True

    async def add_attempt(self, key: str, max_attempts: int = 5, lock_minutes: int = 1):
        """
        Ghi nhận một lần thử sai. Nếu đạt đến giới hạn, thực hiện khóa.
        """
        now = datetime.utcnow()
        record = await self.collection.find_one({"key": key})

        if not record:
            await self.collection.insert_one({
                "key": key,
                "attempts": 1,
                "last_attempt": now,
                "locked_until": None
            })
            return

        new_attempts = record["attempts"] + 1
        
        if new_attempts >= max_attempts:
            locked_until = now + timedelta(minutes=lock_minutes)
            await self.collection.update_one(
                {"key": key},
                {"$set": {"attempts": new_attempts, "locked_until": locked_until, "last_attempt": now}}
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Bạn đã nhập sai {max_attempts} lần. Tài khoản bị tạm khóa trong {lock_minutes} phút."
            )
        else:
            await self.collection.update_one(
                {"key": key},
                {"$set": {"attempts": new_attempts, "last_attempt": now}}
            )

    async def reset(self, key: str):
        """
        Xóa lịch sử sai khi đăng nhập/xác thực thành công.
        """
        await self.collection.delete_one({"key": key})
