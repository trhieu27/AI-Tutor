from fastapi import APIRouter, HTTPException, Depends, status
from jose import jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from app.models.db_models import User
from app.core.database import get_db
from app.core.config import get_settings
from pydantic import BaseModel, EmailStr

settings = get_settings()
router = APIRouter()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    student_id: str
    full_name: str
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db = Depends(get_db)):
    # Check if user exists
    existing_user = await db.users.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email đã được đăng ký")
    
    # Hash password
    hashed_password = pwd_context.hash(request.password)
    
    # Create user
    new_user = User(
        student_id=request.student_id,
        full_name=request.full_name,
        email=request.email,
        hashed_password=hashed_password
    )
    
    user_dict = new_user.dict()
    await db.users.insert_one(user_dict)
    
    # Generate token
    token = create_access_token({"sub": new_user.id, "email": new_user.email})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "student_id": new_user.student_id
        }
    }

@router.post("/login")
async def login(request: LoginRequest, db = Depends(get_db)):
    user = await db.users.find_one({"email": request.email})
    
    if not user:
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác")
    
    if not pwd_context.verify(request.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác")
    
    # Generate token
    token = create_access_token({"sub": user["id"], "email": user["email"]})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "student_id": user["student_id"]
        }
    }
