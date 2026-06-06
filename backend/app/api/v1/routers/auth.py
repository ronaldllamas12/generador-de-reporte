from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import TokenResponse, UserLogin, UserRead, UserRegister

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, session: AsyncSession = Depends(get_db)):
    """Login with email and password."""
    repository = UserRepository(session)
    user = await repository.get_by_email(payload.email)
    
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Usuario desactivado")
    
    access_token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return TokenResponse(access_token=access_token, user=UserRead.from_orm(user))


@router.post("/register", response_model=UserRead)
async def register(payload: UserRegister, session: AsyncSession = Depends(get_db)):
    """Register a new user (admin only in production)."""
    settings = get_settings()
    if not settings.allow_public_registration:
        raise HTTPException(status_code=403, detail="Registro publico deshabilitado")

    repository = UserRepository(session)
    
    # Check if email exists
    existing_user = await repository.get_by_email(payload.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email ya existe")
    
    # Create user
    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="employee",
        is_active=True,
    )
    
    user = await repository.create(new_user)
    return UserRead.from_orm(user)
