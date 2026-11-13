from __future__ import annotations

import base64
import binascii
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, undefer

from app.core.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.user import AvatarUpload, UserPublic

router = APIRouter(tags=["avatars"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_AVATAR_BYTES = 300 * 1024
DATA_URL_PATTERN = re.compile(r"^data:(?P<mime>[\w/+.-]+);base64,(?P<data>.+)$", re.DOTALL)


@router.put("/me/avatar", response_model=UserPublic)
def upload_my_avatar(
    payload: AvatarUpload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    match = DATA_URL_PATTERN.match(payload.image.strip())
    if not match:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image data.")
    mime = match.group("mime").lower()
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only JPEG, PNG, or WebP images are allowed.")
    try:
        data = base64.b64decode(match.group("data"), validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image data.") from exc
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image data.")
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image is too large (max 300 KB).")

    current_user.avatar_data = data
    current_user.avatar_mime = mime
    current_user.avatar_updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/avatar", response_model=UserPublic)
def delete_my_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.avatar_data = None
    current_user.avatar_mime = None
    current_user.avatar_updated_at = None
    db.commit()
    db.refresh(current_user)
    return current_user


# Public on purpose: an <img> tag can't send the bearer token. The URL carries
# a version (?v=) that changes on every upload, so it can be cached forever.
@router.get("/users/{user_id}/avatar")
def get_user_avatar(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).options(undefer(User.avatar_data)).filter(User.id == user_id).first()
    if user is None or not user.avatar_data or not user.avatar_mime:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No profile picture.")
    return Response(
        content=bytes(user.avatar_data),
        media_type=user.avatar_mime,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )
