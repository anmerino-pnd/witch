import unittest
from witch.utils.parsers import (
    extract_url_type,
    is_safe_proxy_url,
    parse_timestamp,
    rewrite_m3u8,
)


class TestURLValidation(unittest.TestCase):
    def test_vod_urls(self):
        self.assertEqual(extract_url_type("https://www.twitch.tv/videos/2858768912"), ("vod", "2858768912", 0))
        self.assertEqual(extract_url_type("http://twitch.tv/videos/12345?t=1h2m3s"), ("vod", "12345", 3723))
        self.assertEqual(extract_url_type("https://www.twitch.tv/ibai/video/987654321"), ("vod", "987654321", 0))

    def test_live_urls(self):
        self.assertEqual(extract_url_type("https://www.twitch.tv/ibai"), ("live", "ibai", 0))
        self.assertEqual(extract_url_type("https://m.twitch.tv/auronplay/"), ("live", "auronplay", 0))
        self.assertEqual(extract_url_type("https://www.twitch.tv/directory"), (None, None, 0))

    def test_youtube_urls(self):
        self.assertEqual(extract_url_type("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), ("youtube", "dQw4w9WgXcQ", 0))
        self.assertEqual(extract_url_type("https://youtu.be/dQw4w9WgXcQ"), ("youtube", "dQw4w9WgXcQ", 0))
        self.assertEqual(extract_url_type("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s"), ("youtube", "dQw4w9WgXcQ", 120))
        self.assertEqual(extract_url_type("https://youtu.be/dQw4w9WgXcQ?t=120"), ("youtube", "dQw4w9WgXcQ", 120))
        self.assertEqual(extract_url_type("https://www.youtube.com/embed/dQw4w9WgXcQ?start=45"), ("youtube", "dQw4w9WgXcQ", 45))
        self.assertEqual(extract_url_type("https://www.youtube.com/shorts/dQw4w9WgXcQ"), ("youtube", "dQw4w9WgXcQ", 0))

    def test_invalid_urls(self):
        self.assertEqual(extract_url_type("https://example.com/video"), (None, None, 0))
        self.assertEqual(extract_url_type("ftp://twitch.tv/videos/123"), (None, None, 0))
        self.assertEqual(extract_url_type("not-a-url"), (None, None, 0))

    def test_parse_timestamp(self):
        self.assertEqual(parse_timestamp("36s"), 36)
        self.assertEqual(parse_timestamp("1m30s"), 90)
        self.assertEqual(parse_timestamp("1h2m3s"), 3723)
        self.assertEqual(parse_timestamp("120"), 120)
        self.assertEqual(parse_timestamp("01:02:03"), 3723)
        self.assertEqual(parse_timestamp("05:30"), 330)

    def test_ssrf_protection(self):
        self.assertTrue(is_safe_proxy_url("https://usher.ttvnw.net/api/channel/hls/ibai.m3u8"))
        self.assertFalse(is_safe_proxy_url("http://localhost:8000/api/history"))
        self.assertFalse(is_safe_proxy_url("http://127.0.0.1:8000/"))
        self.assertFalse(is_safe_proxy_url("http://169.254.169.254/latest/meta-data/"))
        self.assertFalse(is_safe_proxy_url("http://192.168.1.10/admin"))
        self.assertFalse(is_safe_proxy_url("http://10.0.0.1/internal"))
        self.assertFalse(is_safe_proxy_url("http://172.16.0.5/secret"))
        self.assertFalse(is_safe_proxy_url("file:///etc/passwd"))

    def test_rewrite_m3u8(self):
        sample = (
            '#EXTM3U\n'
            '#EXT-X-MAP:URI="init.mp4"\n'
            '#EXTINF:2.000,\n'
            'chunk0.ts\n'
        )
        rewritten = rewrite_m3u8(sample, "https://cdn.example.com/live/index.m3u8")
        self.assertIn('URI="/proxy?url=https%3A%2F%2Fcdn.example.com%2Flive%2Finit.mp4"', rewritten)
        self.assertIn('/proxy?url=https%3A%2F%2Fcdn.example.com%2Flive%2Fchunk0.ts', rewritten)


if __name__ == '__main__':
    unittest.main()

