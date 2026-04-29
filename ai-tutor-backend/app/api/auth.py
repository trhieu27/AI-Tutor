from fastapi import APIRouter, HTTPException, Depends, status, Request
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import random
import string
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4
from app.models.db_models import User
from app.core.database import get_db
from app.core.config import get_settings
from app.core.email import send_otp_email
from app.core.security import RateLimiter
from pydantic import BaseModel, EmailStr
from fastapi.security import OAuth2PasswordBearer

settings = get_settings()
router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token không hợp lệ")
        return user_id
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token đã hết hạn")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Không thể xác thực danh tính")

# Password hashing
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    student_id: str
    full_name: str
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user: dict

class RefreshRequest(BaseModel):
    refresh_token: str

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db = Depends(get_db)):
    existing_user = await db.users.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email đã được đăng ký")
    
    hashed_password = pwd_context.hash(request.password)
    
    new_user = User(
        student_id=request.student_id,
        full_name=request.full_name,
        email=request.email,
        hashed_password=hashed_password
    )
    
    user_dict = new_user.dict()
    await db.users.insert_one(user_dict)
    
    token_data = {"sub": new_user.id, "email": new_user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "student_id": new_user.student_id
        }
    }

@router.post("/login")
async def login(request: LoginRequest, fastapi_request: Request, db = Depends(get_db)):
    limiter = RateLimiter(db)
    
    # 1. Kiểm tra xem có đang bị khóa không
    await limiter.check_limit(request.email)
    
    user = await db.users.find_one({"email": request.email})
    
    if not user or not pwd_context.verify(request.password, user["hashed_password"]):
        # 2. Ghi nhận 1 lần thử sai
        await limiter.add_attempt(request.email)
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác")
    
    # 3. Đăng nhập thành công -> Reset bộ đếm
    await limiter.reset(request.email)

    # 4. Record session (IP + User-Agent)
    session_id = str(uuid4())
    ua = fastapi_request.headers.get("user-agent", "")[:300]
    ip = fastapi_request.client.host if fastapi_request.client else ""
    await db.user_sessions.insert_one({
        "id": session_id,
        "user_id": user["id"],
        "user_agent": ua,
        "ip_address": ip,
        "created_at": datetime.utcnow(),
        "last_active": datetime.utcnow(),
    })
    
    # Generate tokens
    token_data = {"sub": user["id"], "email": user["email"], "sid": session_id}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id":         user["id"],
            "full_name":  user["full_name"],
            "email":      user["email"],
            "student_id": user["student_id"],
            "is_pro":     user.get("is_pro", False),
        }
    }

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db = Depends(get_db)):
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Don't reveal if user exists or not for security, but for project we can
        raise HTTPException(status_code=404, detail="Email không tồn tại trong hệ thống")
    
    # Generate 6-digit OTP
    otp = "".join(random.choices(string.digits, k=6))
    
    # Store OTP with 5 min expiration
    await db.otps.update_one(
        {"email": request.email},
        {"$set": {
            "otp": otp,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=5)
        }},
        upsert=True
    )
    
    # Send real email
    send_otp_email(request.email, otp)
    
    return {"message": "Mã xác thực đã được gửi tới email của bạn"}

@router.post("/verify-otp")
async def verify_otp(request: VerifyOtpRequest, db = Depends(get_db)):
    limiter = RateLimiter(db)
    # OTP is more sensitive, only give 3 attempts
    await limiter.check_limit(f"otp_{request.email}", max_attempts=3)
    
    otp_record = await db.otps.find_one({"email": request.email, "otp": request.otp})
    
    if not otp_record:
        await limiter.add_attempt(f"otp_{request.email}", max_attempts=3)
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác")
    
    if datetime.utcnow() > otp_record["expires_at"]:
        raise HTTPException(status_code=400, detail="Mã OTP đã hết hạn")
    
    await limiter.reset(f"otp_{request.email}")
    return {"message": "Xác thực mã OTP thành công"}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db = Depends(get_db)):
    # Re-verify OTP for security
    otp_record = await db.otps.find_one({"email": request.email, "otp": request.otp})
    
    if not otp_record or datetime.utcnow() > otp_record["expires_at"]:
        raise HTTPException(status_code=400, detail="Xác thực không hợp lệ hoặc đã hết hạn")
    
    # Update password
    hashed_password = pwd_context.hash(request.new_password)
    result = await db.users.update_one(
        {"email": request.email},
        {"$set": {"hashed_password": hashed_password}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Không thể cập nhật mật khẩu")
    
    # Clear OTP
    await db.otps.delete_one({"email": request.email})
    
    return {"message": "Mật khẩu đã được đặt lại thành công"}

@router.post("/refresh")
async def refresh(request: RefreshRequest):
    try:
        payload = jwt.decode(request.refresh_token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
        new_access_token = create_access_token({"sub": user_id, "email": email})
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token has expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Could not validate refresh token")

class GoogleLoginRequest(BaseModel):
    token: str

@router.post("/google-login")
async def google_login(request: GoogleLoginRequest, db = Depends(get_db)):
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {request.token}"}
            )
            if userinfo_response.status_code != 200:
                print(f"GOOGLE AUTH ERROR: {userinfo_response.text}")
                raise HTTPException(status_code=400, detail="Xác thực Google thất bại (Token không hợp lệ)")
                
            google_data = userinfo_response.json()
            print(f"Google User Info: {google_data}")
        
        email = google_data.get("email")
        full_name = google_data.get("name", "Người dùng Google")
        
        if not email:
            raise HTTPException(status_code=400, detail="Không lấy được email từ Google")

        user = await db.users.find_one({"email": email})
        if not user:
            student_id = "STU_GG_" + email.split('@')[0]
            new_user_data = {
                "id": str(datetime.utcnow().timestamp()),
                "student_id": student_id,
                "full_name": full_name,
                "email": email,
                "hashed_password": "",
                "provider": "google",
                "created_at": datetime.utcnow()
            }
            await db.users.insert_one(new_user_data)
            user = new_user_data

        token_data = {"sub": str(user.get("id") or user["_id"]), "email": user["email"]}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.get("id") or user["_id"]),
                "full_name": user["full_name"],
                "email": user["email"],
                "student_id": user["student_id"]
            }
        }
    except Exception as e:
        print(f"Google Login Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
