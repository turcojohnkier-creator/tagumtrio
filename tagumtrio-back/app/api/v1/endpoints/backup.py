from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status as http_status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps import get_current_user
from app.services.backup_service import BackupError, export_database, import_database

router = APIRouter(prefix="/backup", tags=["backup"])


def _require_gm(current_user) -> None:
    if current_user.role != "gm":
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Only the GM can back up or restore the database.")


@router.get("")
def download_backup(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    _require_gm(current_user)
    stamp = datetime.now(timezone(timedelta(hours=8))).strftime("%Y%m%d-%H%M")  # Philippine time
    return Response(
        content=export_database(db),
        media_type="application/gzip",
        headers={
            "Content-Disposition": f'attachment; filename="triops-backup-{stamp}.json.gz"',
            "Cache-Control": "no-store",
        },
    )


@router.post("/restore")
async def restore_backup(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    _require_gm(current_user)
    raw = await request.body()
    try:
        counts = await run_in_threadpool(import_database, db, raw)
    except BackupError as exc:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="The backup could not be restored, so nothing was changed. It may be from a different version of the system.",
        ) from exc
    return {"restored": counts}
