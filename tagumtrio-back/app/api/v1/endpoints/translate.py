from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException, status as http_status

from app.deps import get_current_user
from app.schemas.translate import TranslateRequest

router = APIRouter(prefix="/translate", tags=["translate"])

GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"


@router.post("")
async def translate_text(payload: TranslateRequest, current_user=Depends(get_current_user)):
    text = payload.text.strip()
    if not text:
        return {"translated": ""}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                GOOGLE_TRANSLATE_URL,
                params={
                    "client": "gtx",
                    "sl": "auto",
                    "tl": payload.target,
                    "dt": "t",
                    "q": text,
                },
            )
            response.raise_for_status()
            data = response.json()
            translated = "".join(segment[0] for segment in data[0] if segment[0])
            return {"translated": translated}
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Translation service unavailable. Please try again.",
        ) from exc
