import urllib.parse
import re

def parse_timestamp(t_str: str) -> float:
    if not t_str: return 0
    t_str = t_str.lower()
    if 'h' not in t_str and 'm' not in t_str and 's' not in t_str:
        try: return float(t_str)
        except: return 0
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

    if parsed.hostname in ['www.youtube.com', 'youtube.com', 'm.youtube.com']:
        if parsed.path == '/watch':
            if 'v' in qs:
                return 'youtube', qs['v'][0], start_time
    
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
