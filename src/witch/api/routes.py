from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional
import urllib.parse
import httpx
from rich.console import Console

from witch.utils.parsers import extract_url_type, rewrite_m3u8
from witch.data.storage import load_history, save_history
from witch.services.twitch import check_live_status, get_playback_token

router = APIRouter()
console = Console()

class ResolveRequest(BaseModel):
    url: str

class HistoryUpdate(BaseModel):
    timestamp: float
    title: Optional[str] = None
    type: Optional[str] = None

@router.post("/api/resolve")
async def resolve_url(req: ResolveRequest):
    console.log(f"[cyan]Resolving URL:[/cyan] {req.url}")
    url_type, id_val, start_time = extract_url_type(req.url)
    
    if not url_type:
        console.log("[red]Invalid URL provided.[/red]")
        return JSONResponse(status_code=400, content={"error": "Invalid or unsupported video URL."})
        
    if url_type == 'youtube':
        console.log(f"[green]Successfully resolved youtube {id_val}[/green]")
        return {
            "type": url_type,
            "id_val": id_val,
            "start_time": start_time
        }
        
    if url_type == 'live':
        status = await check_live_status(id_val)
        if status == 'offline':
            return JSONResponse(status_code=404, content={"error": "Channel is currently offline."})
        if status == 'error':
            return JSONResponse(status_code=500, content={"error": "Error checking live status."})
            
    token, sig, title = await get_playback_token(id_val, is_live=(url_type == 'live'))
    if not token or not sig:
        console.log(f"[red]Failed to get playback token for {url_type} {id_val}[/red]")
        return JSONResponse(status_code=404, content={"error": "Unable to resolve this Twitch stream. It may be unavailable or restricted."})
        
    if url_type == 'live':
        usher_url = f"https://usher.ttvnw.net/api/channel/hls/{id_val}.m3u8?player=twitchweb&token={urllib.parse.quote(token)}&sig={sig}&allow_source=true"
    else:
        usher_url = f"https://usher.ttvnw.net/vod/{id_val}?nauth={urllib.parse.quote(token)}&nauthsig={sig}&allow_source=true&player=twitchweb"
        
    console.log(f"[green]Successfully resolved {url_type} {id_val}[/green]")
    
    return {
        "type": url_type,
        "m3u8_url": f"/proxy?url={urllib.parse.quote(usher_url)}",
        "raw_url": usher_url,
        "id_val": id_val,
        "start_time": start_time,
        "title": title
    }

@router.post("/api/history/{vod_id}")
async def update_history(vod_id: str, req: HistoryUpdate):
    history = load_history()
    entry = history.pop(vod_id, {})
    if isinstance(entry, (int, float)):
        entry = {"timestamp": float(entry)}
        
    entry["timestamp"] = req.timestamp
    if req.title:
        entry["title"] = req.title
    if req.type:
        entry["type"] = req.type
        
    history[vod_id] = entry
    save_history(history)
    return {"success": True}

@router.get("/api/history")
async def fetch_all_history():
    history = load_history()
    for k, v in history.items():
        if isinstance(v, (int, float)):
            history[k] = {"timestamp": float(v), "title": "Unknown", "type": "vod"}
    return history

@router.get("/api/history/{vod_id}")
async def fetch_history(vod_id: str):
    history = load_history()
    entry = history.get(vod_id, {})
    if isinstance(entry, (int, float)):
        return {"timestamp": float(entry)}
    return {"timestamp": entry.get("timestamp", 0), "title": entry.get("title")}

@router.delete("/api/history")
async def clear_history():
    save_history({})
    console.log("[yellow]Watch history cleared[/yellow]")
    return {"success": True}

@router.get("/proxy")
async def proxy_request(url: str):
    if not url:
        raise HTTPException(status_code=400, detail="Missing URL parameter")
        
    target_parsed = urllib.parse.urlparse(url)
    if target_parsed.hostname in ['localhost', '127.0.0.1'] or target_parsed.hostname.startswith('192.168.') or target_parsed.hostname.startswith('10.'):
        console.log(f"[red]Blocked SSRF attempt to {url}[/red]")
        raise HTTPException(status_code=403, detail="Forbidden destination")

    is_m3u8 = url.endswith('.m3u8') or 'index-dvr' in url or 'usher.ttvnw.net' in url

    try:
        if is_m3u8:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers={'User-Agent': 'Mozilla/5.0'})
                response.raise_for_status()
                content = response.text
                rewritten = rewrite_m3u8(content, url)
                return Response(content=rewritten, media_type='application/vnd.apple.mpegurl')
        else:
            async def stream_generator():
                async with httpx.AsyncClient() as client:
                    async with client.stream('GET', url, headers={'User-Agent': 'Mozilla/5.0'}) as response:
                        response.raise_for_status()
                        async for chunk in response.aiter_bytes(chunk_size=8192):
                            yield chunk
            return StreamingResponse(stream_generator(), media_type='video/MP2T')
    except httpx.HTTPError as e:
        console.log(f"[red]HTTP error during proxy: {e}[/red]")
        raise HTTPException(status_code=502, detail="Bad Gateway")
    except Exception as e:
        console.log(f"[red]Proxy error: {e}[/red]")
        raise HTTPException(status_code=500, detail=str(e))
