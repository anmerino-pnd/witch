import urllib.request
cf_url = "https://d3stzm2eumvgb4.cloudfront.net/93cf88cb5fa6ac3c5d4a_ibai_317602283620_1787927847/chunked/index-dvr.m3u8"

req = urllib.request.Request(cf_url, method="GET")

try:
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')
        print(content[:500])
except Exception as e:
    print(f"Error: {e}")
