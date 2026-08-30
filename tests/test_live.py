import urllib.request
import json

CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko"

def get_live_token(channel):
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
            "isLive": True,
            "login": channel,
            "isVod": False,
            "vodID": "",
            "playerType": "embed"
        }
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print("Token Response:", json.dumps(data, indent=2))
            return data['data']['streamPlaybackAccessToken']['value'], data['data']['streamPlaybackAccessToken']['signature']
    except Exception as e:
        print(f"Error: {e}")

token, sig = get_live_token("ibai")
if token and sig:
    import urllib.parse
    usher_url = f"https://usher.ttvnw.net/api/channel/hls/{'ibai'}.m3u8?player=twitchweb&token={urllib.parse.quote(token)}&sig={sig}&allow_source=true"
    print("Usher URL:", usher_url)
    try:
        req = urllib.request.Request(usher_url)
        with urllib.request.urlopen(req) as response:
            print(response.read().decode('utf-8')[:300])
    except Exception as e:
        print(f"Usher Error: {e}")

