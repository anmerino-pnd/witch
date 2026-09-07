import unittest
from witch.utils.parsers import extract_url_type, parse_timestamp

class TestURLValidation(unittest.TestCase):
    def test_vod_urls(self):
        self.assertEqual(extract_url_type("https://www.twitch.tv/videos/2858768912"), ("vod", "2858768912", 0))
        self.assertEqual(extract_url_type("http://twitch.tv/videos/12345?t=1h2m3s"), ("vod", "12345", 3723))

    def test_live_urls(self):
        self.assertEqual(extract_url_type("https://www.twitch.tv/ibai"), ("live", "ibai", 0))

    def test_youtube_urls(self):
        self.assertEqual(extract_url_type("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), ("youtube", "dQw4w9WgXcQ", 0))
        self.assertEqual(extract_url_type("https://youtu.be/dQw4w9WgXcQ"), ("youtube", "dQw4w9WgXcQ", 0))
        self.assertEqual(extract_url_type("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s"), ("youtube", "dQw4w9WgXcQ", 120))
        self.assertEqual(extract_url_type("https://youtu.be/dQw4w9WgXcQ?t=120"), ("youtube", "dQw4w9WgXcQ", 120))

    def test_invalid_urls(self):
        self.assertEqual(extract_url_type("https://example.com/video"), (None, None, 0))
        self.assertEqual(extract_url_type("ftp://twitch.tv/videos/123"), (None, None, 0))
        self.assertEqual(extract_url_type("not-a-url"), (None, None, 0))

    def test_parse_timestamp(self):
        self.assertEqual(parse_timestamp("36s"), 36)
        self.assertEqual(parse_timestamp("1m30s"), 90)
        self.assertEqual(parse_timestamp("1h2m3s"), 3723)
        self.assertEqual(parse_timestamp("120"), 120)

if __name__ == '__main__':
    unittest.main()
