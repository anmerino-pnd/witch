# Witch — Phase 4: YouTube Video Support

Witch should:

1. Detect that the URL belongs to YouTube.
2. Validate the URL.
3. Extract the YouTube Video ID.
4. Load the video using the official YouTube IFrame Player API.
5. Display the video inside Witch's own UI.
6. Allow Witch's custom controls to interact with the YouTube player.
7. Support configurable skip intervals.
8. Support direct timestamp navigation.

Conceptually:

```text
YouTube URL
     │
     ▼
Platform Detection
     │
     ▼
YouTube URL Parser
     │
     ▼
Video ID
     │
     ▼
YouTube IFrame Player API
     │
     ▼
Official YouTube Player
     │
     ▼
Witch Custom Controls
```

---

# 3. CRITICAL SCOPE RESTRICTION — NO YOUTUBE LIVE

This phase supports:

```text
YouTube Videos
```

This phase does NOT support:

```text
YouTube Live Streams
YouTube Live Replay
YouTube Premieres
Live DVR
Live Chat
Live Seeking
Live Stream Detection
```

YouTube Live functionality is explicitly out of scope.

The implementation must not attempt to resolve or play YouTube Live streams.

If the supplied YouTube content is detected as a live stream, Witch must reject it with a clear message.

Example:

```text
YouTube Live streams are not supported.
```

Do not attempt to partially support Live.

Do not add experimental Live functionality.

Do not reuse the Twitch Live implementation for YouTube.

This phase is strictly:

> **YouTube videos only.**

---

# 4. Existing Functionality Is Protected

The existing Twitch functionality is considered working and must remain protected.

This phase must NOT unnecessarily rewrite:

* Twitch VOD resolution.
* Twitch Live resolution.
* Existing HLS playback.
* Existing custom VOD controls.
* Existing settings.
* Existing application architecture.

Before implementation:

1. Inspect the existing Witch architecture.
2. Understand how Twitch sources are currently detected.
3. Identify reusable playback abstractions.
4. Reuse existing custom controls where appropriate.
5. Add YouTube support as a separate platform integration.
6. Avoid breaking changes.

All existing Twitch functionality must continue working after this phase.

---

# 5. Supported YouTube URL Types

The implementation should support common YouTube video URL formats.

## Standard URL

```text
https://www.youtube.com/watch?v=VIDEO_ID
```

Example:

```text
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

---

## Short URL

```text
https://youtu.be/VIDEO_ID
```

Example:

```text
https://youtu.be/dQw4w9WgXcQ
```

---

## URLs With Additional Parameters

The implementation should correctly extract the Video ID from URLs containing additional parameters.

Example:

```text
https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120
```

The additional parameters should not prevent video loading.

---

# 6. Unsupported URLs

The application must reject invalid or unsupported URLs.

Examples:

```text
https://example.com/video
```

```text
https://google.com
```

```text
http://localhost:8000
```

```text
https://youtube.com/
```

when no valid Video ID is present.

The application should provide a clear error:

```text
Invalid or unsupported YouTube video URL.
```

---

# 7. YouTube Video ID Extraction

Witch does not need a Python library to extract YouTube media.

The only information required from the user URL is the:

```text
Video ID
```

Example:

```text
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Extract:

```text
dQw4w9WgXcQ
```

The Video ID extraction should be implemented using reliable URL parsing.

Do not rely on fragile string splitting when proper URL parsing is available.

The implementation should account for supported URL variations.

Conceptually:

```text
YouTube URL
      │
      ▼
URL Validation
      │
      ▼
URL Parsing
      │
      ▼
Video ID
```

---

# 8. Official YouTube IFrame Player API

The YouTube integration must use the official:

```text
YouTube IFrame Player API
```

The frontend should load and control the official YouTube player.

Conceptually:

```text
Frontend
    │
    ▼
Load YouTube IFrame Player API
    │
    ▼
Create Player
    │
    ▼
Provide Video ID
    │
    ▼
YouTube Handles Playback
```

Witch must not manually handle:

* Video quality selection.
* Audio streams.
* Video streams.
* Adaptive streaming.
* DASH manifests.
* HLS manifests.
* Signed media URLs.
* Media segment downloading.

Those responsibilities belong to YouTube's official player infrastructure.

---

# 9. No Media Extraction

This is a strict requirement.

Do NOT implement functionality intended to extract YouTube playback media URLs.

Specifically, do not attempt to obtain:

```text
videoplayback URLs
googlevideo URLs
.m3u8 playlists
.mpd manifests
audio-only streams
video-only streams
signed playback URLs
```

Do not use third-party extraction libraries for this phase.

Examples of functionality that must NOT be added include:

```text
yt-dlp
pytube
youtube-dl
custom YouTube stream extraction
browser network scraping
DevTools request reproduction
```

The purpose of this phase is not to extract YouTube streams.

The purpose is:

> Use the official YouTube player and control it through Witch.

---

# 10. Player Architecture

The application should maintain platform-specific playback implementations while exposing a common control model where practical.

Conceptually:

```text
                     WITCH
                       │
               Platform Detector
                       │
         ┌─────────────┼─────────────┐
         │             │             │
      Twitch        Twitch       YouTube
       VOD           Live         Video
         │             │             │
         ▼             ▼             ▼
    HLS Player     HLS Player    YouTube API
         │             │             │
         └─────────────┼─────────────┘
                       │
                       ▼
               Player Interface
                       │
          ┌────────────┼────────────┐
          │            │            │
         Play         Pause        State
          │
         Seek
          │
    Skip Intervals
          │
 Timestamp Navigation
```

The exact implementation may differ.

The important requirement is to avoid coupling YouTube-specific code directly to Twitch-specific code.

---

# 11. Common Player Capabilities

Where appropriate, the YouTube player integration should expose equivalent functionality to Witch's existing VOD controls.

Conceptually:

```text
play()
pause()
seek(seconds)
getCurrentTime()
getDuration()
```

The existing application architecture should be inspected before introducing a new abstraction.

Do not refactor working code solely for theoretical architectural purity.

Prefer the smallest clean change that supports YouTube correctly.

---

# 12. Custom Playback Controls

YouTube videos should support Witch's custom playback controls.

At minimum:

* Play.
* Pause.
* Configurable backward skip.
* Configurable forward skip.
* Current playback time.
* Video duration where available.
* Timestamp navigation.

Example:

```text
[-60] [-30] [-10]   ▶ / ❚❚   [+10] [+30] [+60]
```

The existing configurable skip interval functionality should be reused where possible.

Do not create separate skip settings exclusively for YouTube unless the existing architecture requires it.

---

# 13. Timestamp Navigation

The existing Witch timestamp navigation concept should work with YouTube videos.

Example:

```text
[01] : [23] : [45]  [Go]
```

The application should convert:

```text
HH:MM:SS
```

into seconds.

Example:

```text
01:23:45
```

equals:

```text
5025 seconds
```

The YouTube player should then seek to that position using the official player API.

The user should not need to drag the native YouTube seek bar to reach a precise timestamp.

This is one of Witch's primary value-added features and should remain consistent across supported VOD platforms.

---

# 14. Skip Intervals

Witch's configurable skip interval system should work with YouTube videos.

Example:

```text
[-30 seconds]
[+30 seconds]
```

Conceptually:

```text
currentTime - interval
```

and:

```text
currentTime + interval
```

The implementation must prevent invalid positions.

For example:

```text
currentTime < 0
```

must clamp to:

```text
0
```

Forward seeking should not exceed the available duration.

---

# 15. Platform Detection

Witch should determine which platform the user URL belongs to.

Conceptually:

```text
User URL
    │
    ▼
Platform Detector
    │
    ├── Twitch
    │
    ├── YouTube
    │
    └── Unsupported
```

YouTube detection should support the approved YouTube domains.

Twitch behavior must remain unchanged.

An unsupported platform should display a clear error.

Example:

```text
Unsupported video platform.
```

---

# 16. YouTube Video Validation

Before initializing the YouTube player, validate the supplied URL and Video ID.

The implementation should distinguish between:

```text
VALID
INVALID
UNSUPPORTED
```

Examples:

### Valid

```text
https://www.youtube.com/watch?v=VIDEO_ID
```

### Valid

```text
https://youtu.be/VIDEO_ID
```

### Invalid

```text
https://example.com/video
```

### Invalid

```text
https://youtube.com/
```

### Unsupported

```text
YouTube Live URL/content
```

---

# 17. YouTube Live Detection

Because YouTube Live is explicitly unsupported, the implementation must not accidentally initialize a Live stream as a normal VOD.

The implementation should research the appropriate official player/API state or metadata mechanisms necessary to determine whether the requested content is live.

If the content is currently live, show:

```text
YouTube Live streams are not supported in Witch.
```

Do not:

* Initialize Live playback.
* Add Live controls.
* Add DVR support.
* Attempt HLS extraction.
* Attempt DASH extraction.

---

# 18. UI Behavior

The user experience should remain simple.

Example:

```text
┌──────────────────────────────────────────────┐
│ Video URL                                   │
│                                              │
│ [ YouTube or Twitch URL ]          [ Load ] │
└──────────────────────────────────────────────┘


┌──────────────────────────────────────────────┐
│                                              │
│                  VIDEO                       │
│                                              │
│          YouTube Player / Twitch             │
│                                              │
└──────────────────────────────────────────────┘


[-60] [-30] [-10]   [ ▶ ]   [+10] [+30] [+60]


Timestamp

[ HH ] : [ MM ] : [ SS ] [ Go ]
```

The UI should make the integration feel like part of Witch rather than like a completely separate application.

---

# 19. YouTube Player Branding and UI Constraints

The implementation must respect the capabilities and limitations of the official YouTube player.

Do not attempt to:

* Remove required YouTube branding through unsupported methods.
* Modify the YouTube iframe internals.
* Access the iframe DOM across origins.
* Bypass YouTube player restrictions.
* Reproduce YouTube's internal player behavior through scraping.

Witch may provide its own surrounding controls where supported by the official API.

---

# 20. Security Requirements

## URL Validation

Never treat the user-supplied URL as an arbitrary backend fetch target.

Do not implement:

```text
GET /fetch?url=<arbitrary-url>
```

for YouTube URLs.

The frontend should parse and validate supported URLs.

If backend validation is involved, it must also validate the domain and structure.

---

## SSRF Prevention

The YouTube integration must not create a generic proxy or arbitrary URL fetcher.

Reject:

* localhost.
* Private IP addresses.
* Internal domains.
* Arbitrary domains.
* Cloud metadata endpoints.

The implementation should only accept supported YouTube URL formats.

---

## No Secrets

The YouTube IFrame Player API integration should not introduce unnecessary secrets.

Do not:

* Hardcode credentials.
* Add API keys unless required for a specific documented feature.
* Expose server-side secrets to the browser.

If any configuration becomes necessary, document it clearly.

---

# 21. Local-First Requirements

Witch remains a lightweight, local-first application.

Do not introduce:

* User accounts.
* Database storage.
* Analytics.
* Telemetry.
* Cloud storage.
* Authentication systems.

The YouTube player should integrate into the existing local application architecture.

---

# 22. Error Handling

The implementation should handle at least the following states.

## Invalid URL

```text
Invalid or unsupported YouTube video URL.
```

## Video unavailable

```text
This YouTube video is unavailable.
```

## Video restricted

```text
This video cannot be played in the embedded player.
```

## Playback initialization failure

```text
Unable to initialize the YouTube player.
```

## YouTube Live

```text
YouTube Live streams are not supported.
```

## Generic failure

```text
Unable to load the YouTube video.
```

The application must not crash if YouTube rejects or fails to load the video.

---

# 23. Existing Twitch Behavior

After adding YouTube support, the following must continue working.

## Twitch VOD

* Twitch URL input.
* HLS resolution.
* Playback.
* Custom skip intervals.
* Timestamp navigation.

## Twitch Live

* Channel URL input.
* Live detection.
* HLS resolution.
* Live playback.
* Live-specific UI.

The YouTube integration must not interfere with either mode.

---

# 24. Testing

Add tests where practical.

## Platform Detection

Test:

```text
Twitch VOD URL → Twitch VOD
```

```text
Twitch Channel URL → Twitch Channel
```

```text
YouTube Video URL → YouTube Video
```

```text
youtu.be URL → YouTube Video
```

```text
Invalid URL → Invalid
```

---

## YouTube URL Parsing

Test:

* Standard YouTube URLs.
* Short YouTube URLs.
* URLs containing timestamps.
* URLs containing additional parameters.
* Missing Video ID.
* Invalid domains.
* Malformed URLs.

---

## Timestamp Conversion

Test:

```text
00:00:00 → 0
```

```text
00:00:30 → 30
```

```text
00:01:00 → 60
```

```text
01:00:00 → 3600
```

```text
01:23:45 → 5025
```

---

## Skip Controls

Test:

* Backward skip.
* Forward skip.
* Beginning-of-video clamping.
* End-of-video behavior.

---

## Regression Testing

Run all existing tests.

The following functionality must remain passing:

```text
Twitch VOD
Twitch Live
Existing player controls
Existing settings
```

---

# 25. Manual Verification

Perform manual testing with publicly available regular YouTube videos.

Verify:

1. Open Witch.
2. Paste a standard YouTube video URL.
3. Load the video.
4. Verify the official YouTube player initializes.
5. Play the video.
6. Pause the video.
7. Test backward skip.
8. Test forward skip.
9. Test timestamp navigation.
10. Verify current playback time updates correctly.
11. Test a `youtu.be` URL.
12. Test an invalid URL.
13. Test a YouTube Live URL/content if available and verify that it is rejected.
14. Verify Twitch VOD still works.
15. Verify Twitch Live still works.

---

# 26. Documentation

Update `README.md`.

Document the supported platforms.

Example:

```text
Supported Platforms

✓ Twitch VOD
✓ Twitch Live
✓ YouTube Videos

Not Supported

✗ YouTube Live
✗ YouTube Live DVR
✗ YouTube Live Chat
```

Document that YouTube playback uses the official:

```text
YouTube IFrame Player API
```

Explain that Witch does not extract YouTube media streams.

Example:

```text
Witch does not extract or download YouTube media streams.
YouTube videos are played using the official YouTube player API.
```

Also document:

* Supported YouTube URL formats.
* Timestamp navigation.
* Custom skip intervals.
* Known embedded-player limitations.

---

# 27. Implementation Workflow

The coding agent should follow this sequence.

## Phase 4.1 — Inspect Existing Architecture

Understand:

* Platform detection.
* Twitch implementation.
* Existing player controls.
* Timestamp logic.
* Skip interval logic.

Do not modify code until the existing architecture is understood.

---

## Phase 4.2 — Research Official Integration

Review the current official YouTube IFrame Player API documentation.

Confirm:

* Player initialization.
* Loading videos by Video ID.
* Play/pause methods.
* Current time retrieval.
* Duration retrieval.
* Seeking.
* Player states.
* Error handling.
* Embedded player limitations.

Use the official integration approach.

---

## Phase 4.3 — Platform Detection

Extend Witch's URL detection to identify YouTube.

Preserve existing Twitch behavior.

---

## Phase 4.4 — URL Parsing

Implement reliable YouTube Video ID extraction.

Support approved URL formats.

Reject unsupported URLs.

---

## Phase 4.5 — YouTube Player Integration

Integrate the official YouTube IFrame Player API.

Initialize the player using the extracted Video ID.

Do not implement media extraction.

---

## Phase 4.6 — Custom Controls

Connect Witch's existing controls to the YouTube player.

Implement:

* Play.
* Pause.
* Skip backward.
* Skip forward.
* Timestamp navigation.

---

## Phase 4.7 — Live Protection

Ensure YouTube Live content is rejected.

Do not implement Live support.

---

## Phase 4.8 — Error Handling

Implement clear user-facing error states.

---

## Phase 4.9 — Testing

Run:

* New YouTube tests.
* Existing Twitch tests.
* Manual integration tests.

---

## Phase 4.10 — Documentation

Update the README.

Document supported and unsupported YouTube content.

---

# 28. Definition of Done

Phase 4 is complete when:

* [ ] Witch detects YouTube URLs.
* [ ] Witch supports standard YouTube video URLs.
* [ ] Witch supports `youtu.be` URLs.
* [ ] Witch correctly extracts the Video ID.
* [ ] The official YouTube IFrame Player API is used.
* [ ] Regular YouTube videos play inside Witch.
* [ ] Play works.
* [ ] Pause works.
* [ ] Custom backward skip works.
* [ ] Custom forward skip works.
* [ ] Timestamp navigation works.
* [ ] Invalid URLs are rejected.
* [ ] Unavailable videos are handled gracefully.
* [ ] Embedded-player failures are handled gracefully.
* [ ] YouTube Live streams are explicitly rejected.
* [ ] No YouTube HLS extraction is implemented.
* [ ] No DASH extraction is implemented.
* [ ] No `videoplayback` extraction is implemented.
* [ ] No media downloading functionality is added.
* [ ] Twitch VOD functionality still works.
* [ ] Twitch Live functionality still works.
* [ ] Existing tests pass.
* [ ] New tests pass.
* [ ] README documentation is updated.

---

# 29. Important Agent Constraints

The coding agent MUST:

1. Support YouTube videos only.
2. NOT support YouTube Live.
3. Use the official YouTube IFrame Player API.
4. NOT extract `.m3u8` URLs.
5. NOT extract `.mpd` manifests.
6. NOT scrape `videoplayback` URLs.
7. NOT use media extraction libraries.
8. NOT implement downloading.
9. NOT implement recording.
10. NOT reverse engineer YouTube playback infrastructure.
11. Reuse existing Witch controls where practical.
12. Preserve all existing Twitch functionality.
13. Keep the implementation lightweight.
14. Keep the application local-first.
15. Validate user-supplied URLs safely.
16. Avoid unnecessary backend complexity.

---

# 30. Expected Result

After Phase 4, Witch should conceptually support:

```text
                         WITCH
                           │
                    Video URL Input
                           │
                 Platform Detection
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      Twitch VOD       Twitch Live      YouTube Video
          │                │                │
          ▼                ▼                ▼
      HLS Resolver      HLS Resolver    Extract Video ID
          │                │                │
          ▼                ▼                ▼
       HLS Player       HLS Player    YouTube IFrame API
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                    Witch Controls
                           │
              ┌────────────┼────────────┐
              │            │            │
             Play         Pause        State
                           │
                    VOD Platforms
                           │
              ┌────────────┴────────────┐
              │                         │
             Skip                 Timestamp Seek
```

The supported content is:

```text
✓ Twitch VOD
✓ Twitch Live
✓ YouTube Videos
```

The unsupported content includes:

```text
✗ YouTube Live
✗ YouTube Live DVR
✗ YouTube Live Chat
✗ YouTube media extraction
✗ YouTube downloading
```

The guiding principle for this phase is:

> **Use YouTube's official player for YouTube videos and let Witch provide the custom navigation experience around it.**
