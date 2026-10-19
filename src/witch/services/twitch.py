import httpx
from rich.console import Console

console = Console()
CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko"
GQL_URL = "https://gql.twitch.tv/gql"

_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=5.0),
            limits=httpx.Limits(max_keepalive_connections=25, max_connections=60),
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        )
    return _http_client


async def close_http_client() -> None:
    global _http_client
    if _http_client is not None and not _http_client.is_closed:
        await _http_client.aclose()
        _http_client = None


async def check_live_status(channel: str):
    headers = {
        "Client-ID": CLIENT_ID,
        "Content-Type": "application/json",
    }
    payload = {
        "query": f'query{{user(login:"{channel}"){{stream{{id archiveVideo{{id}}}}}}}}'
    }
    client = get_http_client()
    try:
        response = await client.post(GQL_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        user_data = (data.get("data") or {}).get("user")
        if user_data and user_data.get("stream"):
            stream = user_data["stream"]
            archive_id = (stream.get("archiveVideo") or {}).get("id")
            return "live", archive_id
        return "offline", None
    except Exception as e:
        console.log(f"[red]Error checking live status: {e}[/red]")
        return "error", None


async def get_playback_token(id_val: str, is_live: bool, return_meta: bool = False):
    headers = {
        "Client-ID": CLIENT_ID,
        "Content-Type": "application/json",
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
          video(id: $vodID) @include(if: $isVod) {
            title
            lengthSeconds
            game {
              name
            }
            owner {
              login
              displayName
              profileImageURL(width: 70)
            }
          }
          user(login: $login) @include(if: $isLive) {
            login
            displayName
            profileImageURL(width: 70)
            stream {
              id
              title
              viewersCount
              createdAt
              game {
                name
              }
              archiveVideo {
                id
              }
            }
          }
        }""",
        "variables": {
            "isLive": is_live,
            "login": id_val if is_live else "",
            "isVod": not is_live,
            "vodID": "" if is_live else id_val,
            "playerType": "embed",
        },
    }

    client = get_http_client()
    try:
        response = await client.post(GQL_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json().get("data") or {}
        token_data = (
            data.get("streamPlaybackAccessToken")
            if is_live
            else data.get("videoPlaybackAccessToken")
        )
        if not token_data:
            return (None, None, None, {}) if return_meta else (None, None, None)

        title = None
        meta = {}
        if is_live and data.get("user"):
            user = data["user"]
            stream = user.get("stream") or {}
            title = stream.get("title")
            meta = {
                "channel": user.get("displayName") or user.get("login") or id_val,
                "login": user.get("login") or id_val,
                "avatar": user.get("profileImageURL"),
                "game": (stream.get("game") or {}).get("name"),
                "viewers": stream.get("viewersCount"),
                "started_at": stream.get("createdAt"),
                "archive_id": (stream.get("archiveVideo") or {}).get("id"),
            }
        elif not is_live and data.get("video"):
            video = data["video"]
            owner = video.get("owner") or {}
            title = video.get("title")
            meta = {
                "channel": owner.get("displayName") or owner.get("login"),
                "login": owner.get("login"),
                "avatar": owner.get("profileImageURL"),
                "game": (video.get("game") or {}).get("name"),
                "duration": video.get("lengthSeconds"),
            }

        if return_meta:
            return token_data.get("value"), token_data.get("signature"), title, meta
        return token_data.get("value"), token_data.get("signature"), title
    except Exception as e:
        console.log(f"[red]Error fetching token: {e}[/red]")
        return (None, None, None, {}) if return_meta else (None, None, None)

