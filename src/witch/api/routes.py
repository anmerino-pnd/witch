import asyncio
import time
import urllib.parse
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from rich.console import Console

from witch.data.storage import load_history, save_history
from witch.services.twitch import check_live_status, get_http_client, get_playback_token
from witch.utils.parsers import extract_url_type, is_safe_proxy_url, rewrite_m3u8

router = APIRouter()
console = Console()


class ResolveRequest(BaseModel):
    url: str


class HistoryUpdate(BaseModel):
    timestamp: float
    title: Optional[str] = None
    type: Optional[str] = None
    duration: Optional[float] = None
    channel: Optional[str] = None


@router.post("/api/resolve")
async def resolve_url(req: ResolveRequest):
    console.log(f"[cyan]Resolving URL:[/cyan] {req.url}")
    url_type, id_val, start_time = extract_url_type(req.url)

    if not url_type:
        console.log("[red]Invalid URL provided.[/red]")
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid or unsupported video URL."},
        )

    if url_type == "youtube":
        console.log(f"[green]Successfully resolved youtube {id_val}[/green]")
        return {
            "type": url_type,
            "id_val": id_val,
            "start_time": start_time,
        }

    archive_id = None
    meta = {}

    if url_type == "live":
        (status, checked_archive_id), token_res = await asyncio.gather(
            check_live_status(id_val),
            get_playback_token(id_val, is_live=True, return_meta=True),
        )
        if status == "offline":
            return JSONResponse(
                status_code=404,
                content={"error": "Channel is currently offline."},
            )
        if status == "error":
            return JSONResponse(
                status_code=500,
                content={"error": "Error checking live status."},
            )
        token, sig, title, meta = token_res
        archive_id = checked_archive_id or meta.get("archive_id")
    else:
        token, sig, title, meta = await get_playback_token(
            id_val, is_live=False, return_meta=True
        )

    if not token or not sig:
        console.log(f"[red]Failed to get playback token for {url_type} {id_val}[/red]")
        return JSONResponse(
            status_code=404,
            content={
                "error": "Unable to resolve this Twitch stream. It may be unavailable or restricted."
            },
        )

    if url_type == "live":
        usher_url = (
            f"https://usher.ttvnw.net/api/channel/hls/{id_val}.m3u8"
            f"?player=twitchweb&token={urllib.parse.quote(token)}&sig={sig}"
            f"&allow_source=true&allow_audio_only=false&fast_bread=true"
        )
    else:
        usher_url = (
            f"https://usher.ttvnw.net/vod/{id_val}"
            f"?nauth={urllib.parse.quote(token)}&nauthsig={sig}"
            f"&allow_source=true&allow_audio_only=false&player=twitchweb"
        )

    console.log(f"[green]Successfully resolved {url_type} {id_val}[/green]")

    response_data = {
        "type": url_type,
        "m3u8_url": f"/proxy?url={urllib.parse.quote(usher_url, safe='')}",
        "raw_url": usher_url,
        "id_val": id_val,
        "start_time": start_time,
        "title": title,
        "meta": meta,
    }

    if url_type == "live" and archive_id:
        response_data["archive_id"] = archive_id
        # Pre-resolve DVR VOD stream URL so live rewind works seamlessly like YouTube
        dvr_token, dvr_sig, _ = await get_playback_token(archive_id, is_live=False)
        if dvr_token and dvr_sig:
            dvr_usher_url = (
                f"https://usher.ttvnw.net/vod/{archive_id}"
                f"?nauth={urllib.parse.quote(dvr_token)}&nauthsig={dvr_sig}"
                f"&allow_source=true&allow_audio_only=false&player=twitchweb"
            )
            response_data["dvr_m3u8_url"] = (
                f"/proxy?url={urllib.parse.quote(dvr_usher_url, safe='')}"
            )

    return response_data


@router.post("/api/history/{vod_id}")
async def update_history(vod_id: str, req: HistoryUpdate):
    history = load_history()
    entry = history.pop(vod_id, {})
    if isinstance(entry, (int, float)):
        entry = {"timestamp": float(entry)}

    entry["timestamp"] = req.timestamp
    entry["last_watched"] = time.time()
    if req.title:
        entry["title"] = req.title
    if req.type:
        entry["type"] = req.type
    if req.duration and req.duration > 0:
        entry["duration"] = req.duration
    if req.channel:
        entry["channel"] = req.channel

    history[vod_id] = entry
    save_history(history)
    return {"success": True}


@router.get("/api/history")
async def fetch_all_history():
    history = load_history()
    for k, v in history.items():
        if isinstance(v, (int, float)):
            history[k] = {
                "timestamp": float(v),
                "title": "Unknown",
                "type": "vod",
                "last_watched": 0,
            }
        elif "last_watched" not in history[k]:
            history[k]["last_watched"] = 0
    return history


@router.get("/api/history/{vod_id}")
async def fetch_history(vod_id: str):
    history = load_history()
    entry = history.get(vod_id, {})
    if isinstance(entry, (int, float)):
        return {"timestamp": float(entry)}
    return {
        "timestamp": entry.get("timestamp", 0),
        "title": entry.get("title"),
        "duration": entry.get("duration"),
        "channel": entry.get("channel"),
    }


@router.delete("/api/history/{vod_id}")
async def delete_history_item(vod_id: str):
    history = load_history()
    if vod_id in history:
        history.pop(vod_id, None)
        save_history(history)
    return {"success": True}


@router.delete("/api/history")
async def clear_history():
    save_history({})
    console.log("[yellow]Watch history cleared[/yellow]")
    return {"success": True}


@router.get("/proxy")
async def proxy_request(url: str):
    if not url:
        raise HTTPException(status_code=400, detail="Missing URL parameter")

    if not is_safe_proxy_url(url):
        console.log(f"[red]Blocked SSRF attempt to {url}[/red]")
        raise HTTPException(status_code=403, detail="Forbidden destination")

    parsed = urllib.parse.urlparse(url)
    path_lower = (parsed.path or "").lower()
    is_m3u8 = (
        path_lower.endswith(".m3u8")
        or "index-dvr" in path_lower
        or "usher.ttvnw.net" in (parsed.hostname or "").lower()
    )

    client = get_http_client()

    try:
        if is_m3u8:
            response = await client.get(url)
            response.raise_for_status()
            rewritten = rewrite_m3u8(response.text, url)
            return Response(
                content=rewritten,
                media_type="application/vnd.apple.mpegurl",
                headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
            )
        else:
            req = client.build_request("GET", url)
            upstream = await client.send(req, stream=True)
            if upstream.status_code >= 400:
                await upstream.aclose()
                raise HTTPException(status_code=upstream.status_code, detail="Upstream error")

            content_type = upstream.headers.get("content-type", "video/MP2T")

            async def stream_generator():
                try:
                    async for chunk in upstream.aiter_bytes(chunk_size=65536):
                        yield chunk
                finally:
                    await upstream.aclose()

            return StreamingResponse(
                stream_generator(),
                media_type=content_type,
                headers={"Cache-Control": "public, max-age=3600"},
            )
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        console.log(f"[red]HTTP error during proxy: {e}[/red]")
        raise HTTPException(status_code=502, detail="Bad Gateway")
    except Exception as e:
        console.log(f"[red]Proxy error: {e}[/red]")
        raise HTTPException(status_code=500, detail=str(e))

