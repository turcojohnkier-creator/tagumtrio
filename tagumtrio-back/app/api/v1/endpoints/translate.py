from __future__ import annotations

import html
import logging
import re
import time
from collections import OrderedDict

import httpx
from fastapi import APIRouter, Depends, HTTPException, status as http_status

from app.deps import get_current_user
from app.schemas.translate import TranslateRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/translate", tags=["translate"])

# All members share this one backend, so many people translating the same
# announcement would otherwise mean one outbound call per viewer for
# identical text. Cache by (text, target) so repeats are served for free
# and don't count against Google/MyMemory at all.
_CACHE_MAX_SIZE = 500
_CACHE_TTL_SECONDS = 6 * 60 * 60  # 6 hours
_cache: "OrderedDict[tuple[str, str], tuple[str, float]]" = OrderedDict()


def _cache_get(key: tuple[str, str]) -> str | None:
    entry = _cache.get(key)
    if entry is None:
        return None
    translated, expires_at = entry
    if expires_at < time.monotonic():
        _cache.pop(key, None)
        return None
    _cache.move_to_end(key)
    return translated


def _cache_set(key: tuple[str, str], translated: str) -> None:
    _cache[key] = (translated, time.monotonic() + _CACHE_TTL_SECONDS)
    _cache.move_to_end(key)
    while len(_cache) > _CACHE_MAX_SIZE:
        _cache.popitem(last=False)

GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
# A second unofficial Google endpoint, which often still answers when the
# one above is rate-limiting this server's IP.
GOOGLE_ALT_TRANSLATE_URL = "https://clients5.google.com/translate_a/t"
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
# MyMemory's anonymous tier rejects a query over 500 bytes of UTF-8 (a
# Chinese character is 3 bytes), so longer text is sent in pieces.
MYMEMORY_MAX_BYTES = 480
MYMEMORY_MAX_CHUNKS = 12

_CJK_RE = re.compile(r"[㐀-䶿一-鿿豈-﫿]")
_LATIN_RE = re.compile(r"[A-Za-z]")
# Split after sentence ends and newlines, keeping them on the left piece.
_SENTENCE_BREAK_RE = re.compile(r"(?<=[.!?;\n。！？；])")


def _detect_source(text: str) -> str:
    # MyMemory has no auto-detect ("autodetect" is rejected with "PLEASE
    # SELECT TWO DISTINCT LANGUAGES"). The app's languages are English and
    # Chinese; one CJK character carries about as much as a short word.
    cjk = len(_CJK_RE.findall(text))
    latin = len(_LATIN_RE.findall(text))
    return "zh-CN" if cjk and cjk * 3 >= latin else "en"


def _same_language(a: str, b: str) -> bool:
    return a.split("-")[0].lower() == b.split("-")[0].lower()


def _utf8_len(value: str) -> int:
    return len(value.encode("utf-8"))


def _hard_split(piece: str) -> list[str]:
    parts: list[str] = []
    buffer = ""
    for char in piece:
        if buffer and _utf8_len(buffer + char) > MYMEMORY_MAX_BYTES:
            parts.append(buffer)
            buffer = char
        else:
            buffer += char
    if buffer:
        parts.append(buffer)
    return parts


def _split_for_mymemory(text: str) -> list[str]:
    chunks: list[str] = []
    current = ""
    for piece in _SENTENCE_BREAK_RE.split(text):
        if not piece:
            continue
        if _utf8_len(current + piece) <= MYMEMORY_MAX_BYTES:
            current += piece
            continue
        if current:
            chunks.append(current)
            current = ""
        if _utf8_len(piece) <= MYMEMORY_MAX_BYTES:
            current = piece
        else:
            *full, current = _hard_split(piece)
            chunks.extend(full)
    if current:
        chunks.append(current)
    return chunks


async def _translate_via_google(client: httpx.AsyncClient, text: str, target: str) -> str:
    response = await client.get(
        GOOGLE_TRANSLATE_URL,
        params={"client": "gtx", "sl": "auto", "tl": target, "dt": "t", "q": text},
        headers=GOOGLE_REQUEST_HEADERS,
    )
    response.raise_for_status()
    data = response.json()
    return "".join(segment[0] for segment in data[0] if segment[0])


async def _translate_via_google_alt(client: httpx.AsyncClient, text: str, target: str) -> str:
    response = await client.get(
        GOOGLE_ALT_TRANSLATE_URL,
        params={"client": "dict-chrome-ex", "sl": "auto", "tl": target, "q": text},
        headers=GOOGLE_REQUEST_HEADERS,
    )
    response.raise_for_status()
    data = response.json()
    # One item per query: ["translated", "detected-lang"], or a bare string.
    parts = [item[0] if isinstance(item, list) and item else item for item in data]
    translated = "".join(part for part in parts if isinstance(part, str))
    if not translated:
        raise ValueError(f"Google alt endpoint returned no translation: {data!r}")
    return translated


async def _mymemory_chunk(client: httpx.AsyncClient, text: str, source: str, target: str) -> str:
    response = await client.get(
        MYMEMORY_TRANSLATE_URL,
        params={"q": text, "langpair": f"{source}|{target}"},
    )
    response.raise_for_status()
    data = response.json()
    translated = (data.get("responseData") or {}).get("translatedText")
    if not translated or data.get("responseStatus") not in (200, "200") or data.get("quotaFinished"):
        raise ValueError(f"MyMemory returned no translation: {data!r}")
    return html.unescape(translated)


async def _translate_via_mymemory(client: httpx.AsyncClient, text: str, target: str) -> str:
    source = _detect_source(text)
    if _same_language(source, target):
        # Already in the reader's language; MyMemory refuses same-language pairs.
        return text

    chunks = _split_for_mymemory(text)
    if len(chunks) > MYMEMORY_MAX_CHUNKS:
        raise ValueError(f"Text too long for MyMemory fallback ({len(chunks)} chunks)")

    translated_parts: list[str] = []
    for chunk in chunks:
        core = chunk.strip()
        if not core:
            translated_parts.append(chunk)
            continue
        # Keep the chunk's surrounding whitespace (line breaks between
        # paragraphs), which MyMemory would otherwise drop.
        leading = chunk[: len(chunk) - len(chunk.lstrip())]
        trailing = chunk[len(chunk.rstrip()):]
        translated_parts.append(leading + await _mymemory_chunk(client, core, source, target) + trailing)
    return "".join(translated_parts)


@router.post("")
async def translate_text(payload: TranslateRequest, current_user=Depends(get_current_user)):
    text = payload.text.strip()
    if not text:
        return {"translated": ""}

    cache_key = (text, payload.target)
    cached = _cache_get(cache_key)
    if cached is not None:
        return {"translated": cached}

    last_exc: Exception | None = None
    async with httpx.AsyncClient(timeout=10) as client:
        # Google is tried first (better quality, no length limit) with a
        # couple of retries to absorb transient blocks/rate-limits.
        for attempt in range(1, GOOGLE_ATTEMPTS + 1):
            try:
                translated = await _translate_via_google(client, text, payload.target)
                _cache_set(cache_key, translated)
                return {"translated": translated}
            except Exception as exc:
                last_exc = exc
                logger.warning("Google translate attempt %s/%s failed: %r", attempt, GOOGLE_ATTEMPTS, exc)

        try:
            translated = await _translate_via_google_alt(client, text, payload.target)
            _cache_set(cache_key, translated)
            return {"translated": translated}
        except Exception as exc:
            last_exc = exc
            logger.warning("Google alt translate failed: %r", exc)

        # Fall back to MyMemory, a free API meant for programmatic use, in
        # case Google is blocking this server's IP outright.
        try:
            translated = await _translate_via_mymemory(client, text, payload.target)
            _cache_set(cache_key, translated)
            return {"translated": translated}
        except Exception as exc:
            last_exc = exc
            logger.warning("MyMemory fallback failed: %r", exc)

    logger.error("Translation failed after all providers", exc_info=last_exc)
    raise HTTPException(
        status_code=http_status.HTTP_502_BAD_GATEWAY,
        detail="Translation service unavailable. Please try again.",
    ) from last_exc
