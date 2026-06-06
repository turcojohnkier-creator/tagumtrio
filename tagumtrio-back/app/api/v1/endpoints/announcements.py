from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.schemas.announcement import AnnouncementCreate, AnnouncementPublic, AnnouncementUpdate
from app.services.announcement_service import create_announcement, delete_announcement, list_announcements, update_announcement

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("", response_model=list[AnnouncementPublic])
def get_announcements(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
) -> list[AnnouncementPublic]:
    if current_user is None:
        raise HTTPException(status_code=http_status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return list_announcements(db)


@router.post("", response_model=AnnouncementPublic)
def post_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
) -> AnnouncementPublic:
    if not payload.title.strip():
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Title is required")
    return create_announcement(db, payload)


@router.patch("/{announcement_id}", response_model=AnnouncementPublic)
def patch_announcement(
    announcement_id: str,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
) -> AnnouncementPublic:
    try:
        return update_announcement(db, announcement_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{announcement_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def remove_announcement(
    announcement_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    try:
        delete_announcement(db, announcement_id)
    except ValueError as exc:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc