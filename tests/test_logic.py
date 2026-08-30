import unittest
from witch.server import extract_url_type

class TestTwitchURLValidation(unittest.TestCase):
    def test_vod_urls(self):
        self.assertEqual(extract_url_type("https://www.twitch.tv/videos/2858768912"), ("vod", "2858768912"))
        self.assertEqual(extract_url_type("http://twitch.tv/videos/12345"), ("vod", "12345"))
        self.assertEqual(extract_url_type("https://m.twitch.tv/videos/987654?filter=archives&sort=time"), ("vod", "987654"))

    def test_live_urls(self):
        self.assertEqual(extract_url_type("https://www.twitch.tv/ibai"), ("live", "ibai"))
        self.assertEqual(extract_url_type("http://twitch.tv/auronplay"), ("live", "auronplay"))
        self.assertEqual(extract_url_type("https://m.twitch.tv/shroud/"), ("live", "shroud"))

    def test_invalid_urls(self):
        self.assertEqual(extract_url_type("https://youtube.com/watch?v=12345"), (None, None))
        self.assertEqual(extract_url_type("ftp://twitch.tv/videos/123"), (None, None))
        self.assertEqual(extract_url_type("https://www.twitch.tv/"), (None, None))
        self.assertEqual(extract_url_type("not-a-url"), (None, None))

if __name__ == '__main__':
    unittest.main()
