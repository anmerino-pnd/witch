import os
import re
import urllib.parse
import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx
from rich.console import Console

console = Console()
app = FastAPI()

CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko"

# Setup data directory for history
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
HISTORY_FILE = os.path.join(DATA_DIR, 'history.json')

def load_history():
    if not os.path.exists(HISTORY_FILE):
        return {}
    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}

def save_history(history):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2)

class ResolveRequest(BaseModel):
    url: str

class HistoryUpdate(BaseModel):
    timestamp: float

def parse_timestamp(t_str: str) -> float:
    if not t_str: return 0
    t_str = t_str.lower()
    if 'h' not in t_str and 'm' not in t_str and 's' not in t_str:
        try: return float(t_str)
        except: return 0
    # parse 1h2m30s
    import re
    h = re.search(r'(\d+)h', t_str)
    m = re.search(r'(\d+)m', t_str)
    s = re.search(r'(\d+)s', t_str)
    total = 0
    if h: total += int(h.group(1)) * 3600
    if m: total += int(m.group(1)) * 60
    if s: total += int(s.group(1))
    return float(total)

def extract_url_type(url: str):
    if not url.startswith('http://') and not url.startswith('https://'):
        return None, None, 0
    parsed = urllib.parse.urlparse(url)
    qs = urllib.parse.parse_qs(parsed.query)
    start_time = parse_timestamp(qs.get('t', [''])[0])

    # YouTube Standard
    if parsed.hostname in ['www.youtube.com', 'youtube.com', 'm.youtube.com']:
        if parsed.path == '/watch':
            if 'v' in qs:
                return 'youtube', qs['v'][0], start_time
    
    # YouTube Short
    if parsed.hostname == 'youtu.be':
        vid = parsed.path.strip('/')
        if vid:
            return 'youtube', vid, start_time

    if not parsed.hostname or not parsed.hostname.endswith('twitch.tv'):
        return None, None, 0
        
    vod_match = re.search(r'/videos/(\d+)', parsed.path)
    if vod_match:
        return 'vod', vod_match.group(1), start_time
        
    channel_match = re.match(r'^/([a-zA-Z0-9_]{4,25})/?$', parsed.path)
    if channel_match:
        return 'live', channel_match.group(1), 0
        
    return None, None, 0

async def check_live_status(channel: str):
    url = "https://gql.twitch.tv/gql"
    headers = {
        "Client-ID": CLIENT_ID,
        "Content-Type": "application/json"
    }
    payload = {
        "query": f'query{{user(login:"{channel}"){{stream{{id}}}}}}'
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            user = data.get('data', {}).get('user')
            if not user:
                return 'not_found'
            if user.get('stream'):
                return 'live'
            return 'offline'
        except Exception as e:
            console.log(f"[red]Error checking live status: {e}[/red]")
            return 'error'

async def get_playback_token(id_val: str, is_live: bool):
    url = "https://gql.twitch.tv/gql"
    headers = {
        "Client-ID": CLIENT_ID,
        "Content-Type": "application/json"
    }
    payload = {
        "operationName": "PlaybackAccessToken_Template",
        "query": """query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!) {
          streamPlaybackAccessToken(channelName: $login, params: {platform: "web", playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isLive) {
            value
            signature
          }
          videoPlaybackAccessToken(id: $vodID, params: {platform: "web", playerBackend: "mediaplayer", playerType: $playerType}) @include(if: $isVod) {
            value
            signature
          }
        }""",
        "variables": {
            "isLive": is_live,
            "login": id_val if is_live else "",
            "isVod": not is_live,
            "vodID": "" if is_live else id_val,
            "playerType": "embed"
        }
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            token_data = data['data']['streamPlaybackAccessToken'] if is_live else data['data']['videoPlaybackAccessToken']
            return token_data['value'], token_data['signature']
        except Exception as e:
            console.log(f"[red]Error fetching token: {e}[/red]")
            return None, None

@app.post("/api/resolve")
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
        if status == 'not_found':
            return JSONResponse(status_code=404, content={"error": "Twitch channel not found."})
        if status == 'offline':
            return JSONResponse(status_code=400, content={"error": "This Twitch channel is currently offline."})
        if status == 'error':
            return JSONResponse(status_code=500, content={"error": "Error checking live status."})
            
    token, sig = await get_playback_token(id_val, is_live=(url_type == 'live'))
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
        "start_time": start_time
    }

@app.post("/api/history/{vod_id}")
async def update_history(vod_id: str, req: HistoryUpdate):
    history = load_history()
    history[vod_id] = req.timestamp
    save_history(history)
    return {"success": True}

@app.get("/api/history/{vod_id}")
async def fetch_history(vod_id: str):
    history = load_history()
    return {"timestamp": history.get(vod_id, 0)}

@app.delete("/api/history")
async def clear_history():
    save_history({})
    console.log("[yellow]Watch history cleared[/yellow]")
    return {"success": True}

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
    # Create empty cache dir if it doesn't exist
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            f.write("{}")

    console.rule("[bold purple]Witch Server Starting[/bold purple]")
    console.log(f"[green]Starting server on http://localhost:{port}[/green]")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
