import urllib.request
import json

vod_id = "2858768912"
client_id = "kimne78kx3ncx6brgo4mv6wki5h1ko"

def get_token(vod_id):
    url = "https://gql.twitch.tv/gql"
    headers = {
        "Client-ID": client_id,
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
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print("Token response:", json.dumps(data, indent=2))
            return data['data']['videoPlaybackAccessToken']['value'], data['data']['videoPlaybackAccessToken']['signature']
    except Exception as e:
        print(f"Error getting token: {e}")
        return None, None

token, sig = get_token(vod_id)
if token and sig:
    print(f"Token: {token}")
    print(f"Signature: {sig}")
    
    import urllib.parse
    usher_url = f"https://usher.ttvnw.net/vod/{vod_id}?nauth={urllib.parse.quote(token)}&nauthsig={sig}&allow_source=true&player=twitchweb"
    print(f"Usher URL: {usher_url}")
    
    try:
        req = urllib.request.Request(usher_url)
        with urllib.request.urlopen(req) as response:
            m3u8 = response.read().decode('utf-8')
            print("M3U8:", m3u8)
    except Exception as e:
        print(f"Error getting m3u8: {e}")
