import httpx
import json

url = 'https://gql.twitch.tv/gql'
headers = {
    'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
}

q = """
query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!) {
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
}
"""

payload = {
    'query': q,
    'variables': {
        'isLive': False,
        'login': '',
        'isVod': True,
        'vodID': '2865822170',
        'playerType': 'embed'
    }
}

try:
    response = httpx.post(url, json=payload, headers=headers)
    print(response.text)
except Exception as e:
    print(e)
