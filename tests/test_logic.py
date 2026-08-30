import unittest
from witch.server import extract_vod_id

class TestTwitchURLValidation(unittest.TestCase):
    def test_valid_urls(self):
        self.assertEqual(extract_vod_id("https://www.twitch.tv/videos/2858768912"), "2858768912")
        self.assertEqual(extract_vod_id("http://twitch.tv/videos/12345"), "12345")
        self.assertEqual(extract_vod_id("https://m.twitch.tv/videos/987654?filter=archives&sort=time"), "987654")

    def test_invalid_urls(self):
        self.assertIsNone(extract_vod_id("https://youtube.com/watch?v=12345"))
        self.assertIsNone(extract_vod_id("ftp://twitch.tv/videos/123"))
        self.assertIsNone(extract_vod_id("https://www.twitch.tv/notavideo/12345"))
        self.assertIsNone(extract_vod_id("https://www.twitch.tv/videos/abcde"))
        self.assertIsNone(extract_vod_id("not-a-url"))

if __name__ == '__main__':
    unittest.main()
