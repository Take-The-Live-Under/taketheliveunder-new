"""
Simple authentication system for the betting monitor
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import json
from pathlib import Path
import config

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Simple file-based user storage (for simplicity - use database in production)
USERS_FILE = config.DATA_DIR / "users.json"


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None
    is_admin: bool = False


class User(BaseModel):
    username: str
    is_admin: bool = False
    disabled: bool = False


class UserCreate(BaseModel):
    username: str
    password: str
    is_admin: bool = False


def load_users() -> dict:
    """Load users from JSON file"""
    if not USERS_FILE.exists():
        # Create default admin user
        default_users = {
            "admin": {
                "username": "admin",
                "hashed_password": pwd_context.hash("changeme"),
                "is_admin": True,
                "disabled": False
            }
        }
        save_users(default_users)
        return default_users

    with open(USERS_FILE, 'r') as f:
        return json.load(f)


def save_users(users: dict):
    """Save users to JSON file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def authenticate_user(username: str, password: str) -> Optional[dict]:
    """Authenticate a user"""
    users = load_users()
    user = users.get(username)

    if not user:
        return None

    if not verify_password(password, user["hashed_password"]):
        return None

    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)

    return encoded_jwt


def decode_token(token: str) -> Optional[TokenData]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        username: str = payload.get("sub")
        is_admin: bool = payload.get("is_admin", False)

        if username is None:
            return None

        return TokenData(username=username, is_admin=is_admin)

    except JWTError:
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get the current authenticated user"""
    token = credentials.credentials

    token_data = decode_token(token)

    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    users = load_users()
    user = users.get(token_data.username)

    if user is None or user.get("disabled"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or disabled"
        )

    return User(**user)


async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Require admin privileges"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )

    return current_user


def create_user(username: str, password: str, is_admin: bool = False) -> bool:
    """Create a new user"""
    users = load_users()

    if username in users:
        return False

    users[username] = {
        "username": username,
        "hashed_password": get_password_hash(password),
        "is_admin": is_admin,
        "disabled": False
    }

    save_users(users)
    return True


def delete_user(username: str) -> bool:
    """Delete a user"""
    users = load_users()

    if username not in users:
        return False

    # Don't allow deleting the last admin
    if users[username].get("is_admin"):
        admin_count = sum(1 for u in users.values() if u.get("is_admin") and not u.get("disabled"))
        if admin_count <= 1:
            return False

    del users[username]
    save_users(users)
    return True


def list_users() -> list:
    """List all users (without passwords)"""
    users = load_users()
    return [
        {
            "username": u["username"],
            "is_admin": u["is_admin"],
            "disabled": u.get("disabled", False)
        }
        for u in users.values()
    ]
