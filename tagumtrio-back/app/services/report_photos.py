"""Daily-report photos are served by URL instead of inline base64.

Leadmen attach photos as data URLs, and every worker row in a batch carries the
same ones. Shipping them inside every report response is what used up the
hosting bandwidth, so:

- on save, each photo is stored once in `report_photos` (keyed by a content
  hash) and the entry keeps only a short URL;
- reports saved before this change are converted in the background on startup;
- until then, the response serializer swaps any inline photo for the same URL
  and the photo endpoint falls back to reading it from the report.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import logging
import re
from typing import Any, Iterator

from sqlalchemy import String, cast
from sqlalchemy.orm import Session

PHOTO_URL_RE = re.compile(r"/daily-reports/(?P<report_id>[^/?#]+)/photos/(?P<hash>[0-9a-f]{32})")
DATA_URL_RE = re.compile(r"^data:(?P<mime>[\w/+.-]+);base64,(?P<data>.+)$", re.DOTALL)
PHOTO_KEYS = ("photos", "photoUrls", "imageUrls")

# uvicorn/gunicorn print this logger; a module logger would be silent.
logger = logging.getLogger("uvicorn.error")


def photo_hash(data_url: str) -> str:
    return hashlib.sha256(data_url.encode("utf-8")).hexdigest()[:32]


def photo_url(report_id: str, data_url: str) -> str:
    return f"/api/v1/daily-reports/{report_id}/photos/{photo_hash(data_url)}"


def _map_photo_container(value: Any, fn) -> Any:
    if isinstance(value, dict):
        return {key: fn(item) for key, item in value.items()}
    if isinstance(value, list):
        return [fn(item) for item in value]
    return value


def _map_entry(entry: Any, fn) -> Any:
    if not isinstance(entry, dict):
        return entry
    out = dict(entry)
    for key in PHOTO_KEYS:
        if key in out:
            out[key] = _map_photo_container(out[key], fn)
    raw = out.get("raw")
    if isinstance(raw, dict):
        out["raw"] = _map_entry(raw, fn)
    return out


def strip_photos(entries: list | None, report_id: str) -> list:
    def swap(item: Any) -> Any:
        if isinstance(item, str) and item.startswith("data:"):
            return photo_url(report_id, item)
        return item
    return [_map_entry(entry, swap) for entry in (entries or [])]


def _iter_data_urls(entries: list | None) -> Iterator[str]:
    found: list[str] = []
    def collect(item: Any) -> Any:
        if isinstance(item, str) and item.startswith("data:"):
            found.append(item)
        return item
    for entry in entries or []:
        _map_entry(entry, collect)
    yield from found


def find_photo(entries: list | None, wanted_hash: str) -> str | None:
    for data_url in _iter_data_urls(entries):
        if photo_hash(data_url) == wanted_hash:
            return data_url
    return None


def restore_photos(new_entries: list, old_entries: list | None) -> list:
    """On resubmit the form sends back the photo URLs it was shown (absolute,
    pointing at the API host). Map them back to the stored inline photo for
    unconverted reports, otherwise back to the relative photo path."""
    by_hash = {photo_hash(d): d for d in _iter_data_urls(old_entries)}
    def swap(item: Any) -> Any:
        if isinstance(item, str) and not item.startswith("data:"):
            match = PHOTO_URL_RE.search(item)
            if match:
                if match.group("hash") in by_hash:
                    return by_hash[match.group("hash")]
                return f"/api/v1/daily-reports/{match.group('report_id')}/photos/{match.group('hash')}"
        return item
    return [_map_entry(entry, swap) for entry in (new_entries or [])]


def decode_data_url(data_url: str) -> tuple[str, bytes] | None:
    match = DATA_URL_RE.match(data_url.strip())
    if not match:
        return None
    try:
        return match.group("mime").lower(), base64.b64decode(match.group("data"), validate=False)
    except (binascii.Error, ValueError):
        return None


def store_photos(db: Session, report_id: str, entries: list | None) -> list:
    """Move inline photos into report_photos and return the entries with URLs.

    Adds the photo rows to the session; the caller commits them together with
    the report. A photo that can't be decoded is left inline.
    """
    from app.models.report_photo import ReportPhoto

    pending: dict[str, tuple[str, bytes]] = {}

    def swap(item: Any) -> Any:
        if isinstance(item, str) and item.startswith("data:"):
            key = photo_hash(item)
            if key not in pending:
                decoded = decode_data_url(item)
                if decoded is None:
                    return item
                pending[key] = decoded
            return photo_url(report_id, item)
        return item

    out = [_map_entry(entry, swap) for entry in (entries or [])]
    if pending:
        existing = {key for (key,) in db.query(ReportPhoto.hash).filter(ReportPhoto.hash.in_(list(pending))).all()}
        for key, (mime, data) in pending.items():
            if key not in existing:
                db.add(ReportPhoto(hash=key, mime=mime[:64], data=data))
    return out


def convert_inline_photos(session_factory) -> int:
    """One-off conversion of reports saved before photos had their own table.

    Runs at startup in a background thread. One report per session, so only one
    report's photos are in memory at a time. Safe to run repeatedly: converted
    reports no longer match the query.
    """
    from app.models.daily_report import DailyReport

    try:
        with session_factory() as db:
            ids = [
                report_id
                for (report_id,) in db.query(DailyReport.id)
                .filter(cast(DailyReport.entries, String).like('%"data:%'))
                .all()
            ]
    except Exception:
        logger.exception("Report photo conversion: could not list reports")
        return 0

    if not ids:
        return 0

    logger.info("Report photo conversion: %d report(s) to convert", len(ids))
    converted = 0
    for report_id in ids:
        try:
            with session_factory() as db:
                record = db.get(DailyReport, report_id)
                if record is None:
                    continue
                record.entries = store_photos(db, record.id, record.entries)
                db.commit()
                converted += 1
        except Exception:
            logger.exception("Report photo conversion: failed for report %s", report_id)
    logger.info("Report photo conversion: done, %d of %d converted", converted, len(ids))
    return converted
