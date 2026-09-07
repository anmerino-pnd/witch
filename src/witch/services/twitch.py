import httpx
from rich.console import Console

console = Console()
CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko"

async def check_live_status(channel: str):
    url = "https://gql.twitch.tv/gql"
    headers = {
        "Client-ID": CLIENT_ID,
        "Content-Type": "application/json"
    }
    payload = {
        "query": 'query{user(login:"' + channel + '"){stream{id}}}'
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            if data['data']['user'] and data['data']['user']['stream']:
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
          video(id: $vodID) @include(if: $isVod) {
            title
          }
          user(login: $login) @include(if: $isLive) {
            stream {
              title
            }
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
            title = None
            if is_live and data['data'].get('user') and data['data']['user'].get('stream'):
                title = data['data']['user']['stream'].get('title')
            elif not is_live and data['data'].get('video'):
                title = data['data']['video'].get('title')
            return token_data['value'], token_data['signature'], title
        except Exception as e:
            console.log(f"[red]Error fetching token: {e}[/red]")
            return None, None, None
