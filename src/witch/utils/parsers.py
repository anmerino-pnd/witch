import urllib.parse
import ipaddress
import re

_URI_ATTR_RE = re.compile(r'URI="([^"]+)"')
_TWITCH_RESERVED_PATHS = {
    'videos', 'directory', 'downloads', 'jobs', 'p', 'search',
    'settings', 'subscriptions', 'turbo', 'wallet', ' friends', 'inventory',
    'drops', 'moderator', 'dashboard'
}


def parse_timestamp(t_str: str) -> float:
    if not t_str:
        return 0.0
    t_str = str(t_str).strip().lower()
    if ':' in t_str:
        parts = t_str.split(':')
        try:
            if len(parts) == 3:
                return float(int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2]))
            if len(parts) == 2:
                return float(int(parts[0]) * 60 + float(parts[1]))
        except ValueError:
            return 0.0
    if 'h' not in t_str and 'm' not in t_str and 's' not in t_str:
        try:
            return max(0.0, float(t_str))
        except ValueError:
            return 0.0
    h = re.search(r'(\d+)h', t_str)
    m = re.search(r'(\d+)m', t_str)
    s = re.search(r'(\d+(?:\.\d+)?)s', t_str)
    total = 0.0
    if h:
        total += int(h.group(1)) * 3600
    if m:
        total += int(m.group(1)) * 60
    if s:
        total += float(s.group(1))
    return float(total)


def extract_url_type(url: str):
    if not url or not isinstance(url, str):
        return None, None, 0
    url = url.strip()
    if not url.startswith('http://') and not url.startswith('https://'):
        return None, None, 0

    parsed = urllib.parse.urlparse(url)
    hostname = (parsed.hostname or '').lower()
    qs = urllib.parse.parse_qs(parsed.query)
    raw_t = qs.get('t', qs.get('start', ['']))[0]
    start_time = parse_timestamp(raw_t)

    # YouTube standard, mobile, music, shorts, and embed URLs
    if hostname in ('www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com', 'www.youtube-nocookie.com'):
        if parsed.path == '/watch':
            vid = qs.get('v', [''])[0].strip()
            if re.match(r'^[a-zA-Z0-9_-]{6,15}$', vid):
                return 'youtube', vid, start_time
        shorts_or_embed = re.match(r'^/(?:shorts|embed|v)/([a-zA-Z0-9_-]{6,15})/?$', parsed.path)
        if shorts_or_embed:
            return 'youtube', shorts_or_embed.group(1), start_time

    if hostname == 'youtu.be':
        vid = parsed.path.strip('/').split('/')[0]
        if re.match(r'^[a-zA-Z0-9_-]{6,15}$', vid):
            return 'youtube', vid, start_time

    if not hostname or not (hostname == 'twitch.tv' or hostname.endswith('.twitch.tv')):
        return None, None, 0

    # Twitch VOD URLs: /videos/12345 or /channel/video/12345 or /channel/v/12345
    vod_match = re.search(r'/(?:videos|video|v)/(\d+)', parsed.path)
    if vod_match:
        return 'vod', vod_match.group(1), start_time

    # Twitch Live channel URLs: /channel_name
    channel_match = re.match(r'^/([a-zA-Z0-9_]{3,25})/?$', parsed.path)
    if channel_match:
        channel_login = channel_match.group(1).lower()
        if channel_login not in _TWITCH_RESERVED_PATHS:
            return 'live', channel_match.group(1), 0

    return None, None, 0


def is_safe_proxy_url(url: str) -> bool:
    if not url or not isinstance(url, str):
        return False
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return False

    if parsed.scheme not in ('http', 'https'):
        return False

    hostname = (parsed.hostname or '').lower().strip('.')
    if not hostname:
        return False

    if hostname in ('localhost', '0.0.0.0') or hostname.endswith(('.local', '.internal', '.localhost', '.lan')):
        return False

    try:
        ip = ipaddress.ip_address(hostname)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            return False
    except ValueError:
        # Not an IP literal; block obvious private IPv4 prefixes in hostname
        if hostname.startswith(('127.', '10.', '192.168.', '169.254.')):
            return False
        if re.match(r'^172\.(1[6-9]|2\d|3[0-1])\.', hostname):
            return False

    return True


def _proxify_uri(uri: str, base_url: str) -> str:
    full_url = uri if uri.startswith(('http://', 'https://')) else urllib.parse.urljoin(base_url, uri)
    return f"/proxy?url={urllib.parse.quote(full_url, safe='')}"


def rewrite_m3u8(content: str, base_url: str) -> str:
    lines = content.splitlines()
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            new_lines.append(line)
        elif stripped.startswith('#'):
            # Rewrite embedded URI="..." attributes in tags like #EXT-X-MAP or #EXT-X-MEDIA
            if 'URI="' in line:
                line = _URI_ATTR_RE.sub(lambda m: f'URI="{_proxify_uri(m.group(1), base_url)}"', line)
            new_lines.append(line)
        else:
            new_lines.append(_proxify_uri(stripped, base_url))
    return '\n'.join(new_lines) + '\n'

