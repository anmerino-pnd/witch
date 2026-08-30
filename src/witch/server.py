import os
import re
import urllib.parse
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx
from rich.console import Console

console = Console()
app = FastAPI()

CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko"

class ResolveRequest(BaseModel):
    url: str

def extract_vod_id(url: str):
    if not url.startswith('http://') and not url.startswith('https://'):
        return None
    parsed = urllib.parse.urlparse(url)
    if not parsed.hostname or not parsed.hostname.endswith('twitch.tv'):
        return None
    match = re.search(r'/videos/(\d+)', parsed.path)
    if match:
        return match.group(1)
    return None

async def get_playback_token(vod_id: str):
    url = "https://gql.twitch.tv/gql"
    headers = {
        "Client-ID": CLIENT_ID,
        "Content-Type": "application/json"
    }
    payload = {
        "operationName": "PlaybackAccessToken",
        "extensions": {
            "persistedQuery": {
                "version": 1,
                "sha256Hash": "0828119ded1c13477966434e15800ff57ddacf13ba1911c129dc2200705b0712"
            }
        },
        "variables": {
            "isLive": False,
            "login": "",
            "isVod": True,
            "vodID": vod_id,
            "playerType": "embed"
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data['data']['videoPlaybackAccessToken']['value'], data['data']['videoPlaybackAccessToken']['signature']
        except Exception as e:
            console.log(f"[red]Error fetching token: {e}[/red]")
            return None, None

@app.post("/api/vod/resolve")
async def resolve_vod(req: ResolveRequest):
    console.log(f"[cyan]Resolving VOD URL:[/cyan] {req.url}")
    vod_id = extract_vod_id(req.url)
    if not vod_id:
        console.log("[red]Invalid URL provided.[/red]")
        return JSONResponse(status_code=400, content={"error": "Invalid Twitch VOD URL."})
        
    token, sig = await get_playback_token(vod_id)
    if not token or not sig:
        console.log(f"[red]Failed to get playback token for VOD {vod_id}[/red]")
        return JSONResponse(status_code=404, content={"error": "Unable to resolve this Twitch VOD. It may be unavailable or restricted."})
        
    usher_url = f"https://usher.ttvnw.net/vod/{vod_id}?nauth={urllib.parse.quote(token)}&nauthsig={sig}&allow_source=true&player=twitchweb"
    console.log(f"[green]Successfully resolved VOD {vod_id}[/green]")
    
    return {"m3u8_url": f"/proxy?url={urllib.parse.quote(usher_url)}"}

def rewrite_m3u8(content: str, base_url: str):
    lines = content.splitlines()
    new_lines = []
    for line in lines:
        if not line.strip() or line.startswith('#'):
            new_lines.append(line)
        else:
            if not line.startswith('http'):
                line = urllib.parse.urljoin(base_url, line)
            proxy_url = f"/proxy?url={urllib.parse.quote(line)}"
            new_lines.append(proxy_url)
    return '\n'.join(new_lines) + '\n'

@app.get("/proxy")
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
            console.log(f"[dim]Proxying M3U8:[/dim] {url}")
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

# Mount static files for the frontend
static_dir = os.path.join(os.path.dirname(__file__), 'static')
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

def run_server(port=8000):
    import uvicorn
    console.rule("[bold purple]Witch Server Starting[/bold purple]")
    console.log(f"[green]Starting server on http://localhost:{port}[/green]")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
