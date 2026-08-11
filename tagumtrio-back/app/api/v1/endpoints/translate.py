from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status as http_status

from app.deps import get_current_user
from app.schemas.translate import TranslateRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/translate", tags=["translate"])

GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
MYMEMORY_TRANSLATE_URL = "https://api.mymemory.translated.net/get"

# Google blocks/rate-limits requests to the unofficial translate_a/single
# endpoint that don't look like they came from a browser, which is common
# when calling it from a datacenter IP (e.g. Render). Spoofing a normal
# browser User-Agent avoids most of those 403s.
GOOGLE_REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
}

GOOGLE_ATTEMPTS = 2
# MyMemory's anonymous tier rejects requests over ~500 bytes.
MYMEMORY_MAX_LENGTH = 480


async def _translate_via_google(client: httpx.AsyncClient, text: str, target: str) -> str:
    response = await client.get(
        GOOGLE_TRANSLATE_URL,
        params={"client": "gtx", "sl": "auto", "tl": target, "dt": "t", "q": text},
        headers=GOOGLE_REQUEST_HEADERS,
    )
    response.raise_for_status()
    data = response.json()
    return "".join(segment[0] for segment in data[0] if segment[0])


async def _translate_via_mymemory(client: httpx.AsyncClient, text: str, target: str) -> str:
    if len(text) > MYMEMORY_MAX_LENGTH:
        raise ValueError("Text too long for MyMemory fallback")
    response = await client.get(
        MYMEMORY_TRANSLATE_URL,
        params={"q": text, "langpair": f"autodetect|{target}"},
    )
    response.raise_for_status()
    data = response.json()
    translated = data["responseData"]["translatedText"]
    if not translated or data.get("responseStatus") not in (200, "200"):
        raise ValueError(f"MyMemory returned no translation: {data!r}")
    return translated


@router.post("")
async def translate_text(payload: TranslateRequest, current_user=Depends(get_current_user)):
    text = payload.text.strip()
    if not text:
        return {"translated": ""}

    last_exc: Exception | None = None
    async with httpx.AsyncClient(timeout=10) as client:
        # Google is tried first (better quality, no length limit) with a
        # couple of retries to absorb transient blocks/rate-limits.
        for attempt in range(1, GOOGLE_ATTEMPTS + 1):
            try:
                return {"translated": await _translate_via_google(client, text, payload.target)}
            except Exception as exc:
                last_exc = exc
                logger.warning("Google translate attempt %s/%s failed: %r", attempt, GOOGLE_ATTEMPTS, exc)

        # Fall back to MyMemory, a free API meant for programmatic use, in
        # case Google is blocking this server's IP outright.
        try:
            return {"translated": await _translate_via_mymemory(client, text, payload.target)}
        except Exception as exc:
            last_exc = exc
            logger.warning("MyMemory fallback failed: %r", exc)

    logger.error("Translation failed after all providers", exc_info=last_exc)
    raise HTTPException(
        status_code=http_status.HTTP_502_BAD_GATEWAY,
        detail="Translation service unavailable. Please try again.",
    ) from last_exc
