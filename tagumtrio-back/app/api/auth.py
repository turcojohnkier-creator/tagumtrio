from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.db import get_db
from app.deps import get_current_user
from app.security import create_access_token, verify_password

router = APIRouter()


@router.post("/register", response_model=schemas.UserPublic)
def register(user_create: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = crud.get_user_by_identifier(db, user_create.identifier)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Identifier already registered.")
    try:
        return crud.create_user(db, user_create)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_identifier(db, payload.identifier)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    access_token = create_access_token({"sub": user.identifier, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserPublic)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user
