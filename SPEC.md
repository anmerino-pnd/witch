
# Witch — Phase 2: Twitch Live Playback

## 1. Phase Overview

This specification defines **Phase 2** of the Witch project.

Phase 1 has been completed successfully and provides functional Twitch VOD playback with:

* Twitch VOD URL input.
* Automatic VOD → HLS `.m3u8` resolution.
* Custom HTML5/HLS video playback.
* Configurable skip intervals.
* Direct `HH:MM:SS` timestamp seeking.
* Persistent skip interval settings using `localStorage`.
* VOD-specific playback controls.

**Phase 2 must add Twitch Live playback without breaking the existing VOD functionality.**

The primary goal of this phase is deliberately narrow:

> Allow a user to enter a Twitch channel URL, detect whether the channel is currently live, resolve its HLS `.m3u8` playlist, and play the live stream inside Witch's existing player.

Live playback should behave as a true live stream.

**Do not implement DVR, live seeking, rewind, timestamp navigation, or live playback history in this phase.**

---

# 2. Scope

### In scope

* Twitch channel URL input.
* Live-channel detection.
* Twitch Live → HLS `.m3u8` resolution.
* Playback of the live HLS stream inside Witch.
* Clear `LIVE` state in the UI.
* Live-specific player controls.
* Displaying the resolved `.m3u8` URL for debugging/transparency.
* Copying the `.m3u8` URL to the clipboard.
* Appropriate error handling.
* Security validation.
* Automated tests for the new backend logic where practical.
* Documentation of the live-resolution approach and limitations.

### Out of scope

Do NOT implement:

* Live DVR.
* Rewind.
* Fast-forward.
* Timestamp seeking for live streams.
* Live playback history.
* Recording.
* Downloading the live stream.
* Chat integration.
* Stream metadata dashboards.
* Follower/subscriber functionality.
* Twitch account authentication unless the selected resolution mechanism strictly requires it.
* Database storage.
* User accounts.
* Analytics.
* Telemetry.
* Cloud infrastructure.

Keep the implementation small.

---

# 3. Existing VOD Functionality Is Protected

The VOD functionality from Phase 1 is considered stable.

The Phase 2 implementation MUST NOT unnecessarily rewrite or replace working VOD code.

Before modifying shared components:

1. Inspect the existing VOD implementation.
2. Understand its current architecture.
3. Reuse existing abstractions where appropriate.
4. Add live-specific behavior through clean extensions.
5. Avoid breaking changes to VOD behavior.
6. Run the existing VOD tests after implementing Live support.

If a shared abstraction must be modified, preserve all existing VOD behavior.

---

# 4. Supported Input Types

Witch should now support two primary Twitch URL types.

## VOD

Example:

```text
https://www.twitch.tv/videos/2858768912
```

This must continue using the existing Phase 1 VOD flow.

## Channel

Example:

```text
https://www.twitch.tv/ibai
```

This should initiate the Phase 2 Live flow.

Conceptually:

```text
Twitch URL
    │
    ├── /videos/<id>
    │       │
    │       ▼
    │      VOD
    │       │
    │       ▼
    │  Existing VOD resolver
    │
    └── /<channel>
            │
            ▼
          Channel
            │
            ▼
        Is channel live?
            │
       ┌────┴────┐
       │         │
      YES        NO
       │         │
       ▼         ▼
   Resolve      Clear
    HLS        "Offline"
       │
       ▼
    LIVE
```

---

# 5. Live Detection

The application must determine whether the supplied Twitch channel is currently live.

The implementation should investigate the **official Twitch API first** for determining live status.

The agent must research the current Twitch API capabilities and determine the appropriate endpoint/mechanism for checking whether a channel is live.

Do not infer live status by blindly attempting to fetch arbitrary URLs if a proper API-based mechanism is available.

The implementation should distinguish at least:

```text
LIVE
OFFLINE
ERROR
```

### Offline behavior

If the channel exists but is not currently streaming, the UI should clearly communicate:

```text
This channel is currently offline.
```

It must not attempt to initialize the HLS player with an unavailable live playlist.

---

# 6. Live HLS Resolution

Once a channel has been confirmed as live, Witch must resolve the stream into a playable HLS `.m3u8` playlist.

The user must NOT need to manually provide the `.m3u8`.

Example input:

```text
https://www.twitch.tv/ibai
```

Expected conceptual flow:

```text
Channel URL
    ↓
Channel identification
    ↓
Live status check
    ↓
Twitch playback resolution
    ↓
HLS .m3u8
    ↓
Witch player
```

---

# 7. Mandatory Technical Research

Before implementing the Live resolver, the coding agent MUST research the current Twitch playback architecture.

Do not assume that the VOD resolver can simply be reused for Live.

Investigate:

1. How Twitch currently exposes live playback information.
2. How the Twitch web player obtains the live HLS playlist.
3. Whether the official Twitch API exposes the HLS playlist directly.
4. Whether the official API can determine live status independently of playback resolution.
5. Whether live playback requires:

   * Client-ID.
   * OAuth.
   * access token.
   * playback access token.
   * GraphQL.
   * another request mechanism.
6. Whether the resulting HLS URL is temporary or signed.
7. Required HTTP headers.
8. CORS implications.
9. Whether the HLS playlist can be consumed directly by the browser.
10. Whether the resolver should run server-side.
11. Whether the mechanism is documented, semi-documented, or internal.
12. The stability implications of the chosen method.
13. Relevant Twitch terms and technical restrictions.

The agent must document the chosen approach and why it is appropriate for Witch.

---

# 8. Live Resolver Architecture

The live resolver should be isolated from the existing VOD resolver.

Prefer an architecture conceptually similar to:

```text
TwitchResolver
│
├── VodResolver
│
└── LiveResolver
       │
       ├── Channel validation
       ├── Live status
       └── HLS resolution
```

The exact implementation is up to the agent.

The important requirement is that Twitch-specific live resolution logic is not scattered throughout the UI or player code.

---

# 9. HLS Source Exposure

For Phase 2, Witch should expose the resolved HLS `.m3u8` URL in the UI.

This is intentionally included because the application is also being used as a technical experiment for understanding Twitch playback.

Example:

```text
HLS Source

https://usw21.playlist.ttvnw.net/v1/playlist/....m3u8

[Copy]
```

### Requirements

* The URL should be displayed only after successful resolution.
* It should be visually secondary to the video.
* It should be possible to copy it to the clipboard.
* Long URLs must not break the layout.
* The UI should handle URLs that expire.
* The application should not claim that the URL is permanent.

A small indication may be shown:

```text
HLS source may expire.
```

Do not persist the live `.m3u8` URL in `localStorage`.

---

# 10. Live Player Behavior

When the source is a live stream, Witch must explicitly enter **Live Mode**.

Example:

```text
🔴 LIVE
```

The player should use the same underlying HTML5/HLS playback technology as appropriate for VODs, but Live Mode must expose a different control set.

### Live controls

The player should provide only controls appropriate for live playback.

At minimum:

* Play.
* Pause, if technically supported by the implementation.
* Live indicator.
* Volume.
* Fullscreen.
* Standard browser/player controls as appropriate.

The exact control design may reuse existing player infrastructure.

---

# 11. No Live Seeking

This is an explicit Phase 2 requirement.

The Live player MUST NOT expose:

* Backward skip buttons.
* Forward skip buttons.
* Timestamp selector.
* VOD-style seek bar.
* "Go to timestamp" functionality.
* Rewind controls.
* Fast-forward controls.

Do not attempt to emulate DVR behavior.

The goal is simply:

> Watch the current live stream.

---

# 12. Live Edge Behavior

The player should behave as a live player rather than as a VOD.

The implementation should investigate how the selected HLS library handles live playlists and the live edge.

The application should avoid intentionally drifting away from the current live position.

If the player falls significantly behind the live edge due to buffering or another recoverable condition, the implementation may provide a simple:

```text
[Go Live]
```

control.

If implemented, `Go Live` must return playback to the current live edge.

Do not implement manual DVR navigation.

---

# 13. Live UI

The UI should clearly distinguish Live Mode from VOD Mode.

Example:

```text
┌──────────────────────────────────────────────────┐
│ Twitch URL                                       │
│ [ https://www.twitch.tv/ibai ]          [Load]  │
└──────────────────────────────────────────────────┘

                    🔴 LIVE

┌──────────────────────────────────────────────────┐
│                                                  │
│                    VIDEO                         │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘

                 [ ▶ / ❚❚ ] [ 🔊 ] [ ⛶ ]

HLS Source
https://usw21.playlist.ttvnw.net/...
                                      [Copy]
```

The UI should NOT display VOD controls while in Live Mode.

---

# 14. URL Validation

The application must distinguish between:

### Valid VOD

```text
https://www.twitch.tv/videos/2858768912
```

### Valid channel

```text
https://www.twitch.tv/ibai
```

### Invalid Twitch URL

```text
https://example.com/foo
```

### Arbitrary URL

```text
http://localhost:8000
```

Only valid Twitch URLs should enter the Twitch resolution workflow.

---

# 15. Security Requirements

## SSRF prevention

The live resolver must not become a generic URL-fetching proxy.

Do NOT implement:

```text
GET /fetch?url=<arbitrary-url>
```

where arbitrary user input is fetched by the backend.

The backend must first parse and validate the Twitch URL.

Only the required Twitch domains/endpoints should be contacted.

Prevent access to:

* localhost.
* `127.0.0.1`.
* Private IPv4 ranges.
* Private IPv6 ranges.
* Link-local addresses.
* Cloud metadata endpoints.
* Internal hostnames.
* Arbitrary user-controlled domains.

---

## Secrets

If Twitch API credentials are required:

* Store them in environment variables.
* Never hardcode them.
* Never expose them to the browser.
* Never return them through the API.
* Never commit them to Git.

If required, provide:

```text
.env.example
```

with placeholder values only.

---

## HLS URL Handling

The resolved `.m3u8` URL may contain sensitive or temporary query parameters.

Do not:

* Log the full URL unnecessarily.
* Persist it.
* Include it in analytics.
* Store it in the database.
* Send it to unrelated services.

Developer logs should redact sensitive query parameters where appropriate.

---

# 16. Local-First Requirements

Witch remains a small local application.

Do not introduce:

* Database.
* Authentication.
* User accounts.
* Cloud storage.
* Analytics.
* Telemetry.
* Server-side session persistence.

The only existing persistent application setting should remain the VOD skip interval configuration in `localStorage`.

Live HLS URLs should not be persisted.

---

# 17. Error Handling

The Live flow must distinguish common failure states.

## Invalid channel URL

```text
Invalid Twitch channel URL.
```

## Channel offline

```text
This Twitch channel is currently offline.
```

## Channel not found

```text
Twitch channel not found.
```

## Live resolution failure

```text
Unable to resolve the live stream.
```

## HLS playback failure

```text
The live stream was found, but playback could not be started.
```

## Stream ended

If the stream goes offline while Witch is playing:

```text
The live stream has ended.
```

The UI should allow the user to attempt:

```text
[Reload]
```

rather than crashing.

---

# 18. Live Stream Lifecycle

Live streams can end while the application is running.

The implementation must account for this.

Expected behavior:

```text
LIVE
  │
  │ streamer ends stream
  ▼
HLS stops / playlist becomes unavailable
  │
  ▼
Witch detects failure/end
  │
  ▼
"Stream has ended"
```

Do not treat a normal stream ending as an application crash.

The user should be able to load the channel again to check whether it has started streaming again.

---

# 19. Reuse Existing Player Infrastructure

If Phase 1 already has a reusable player abstraction, extend it.

For example:

```text
Player
│
├── VOD mode
│     ├── seek
│     ├── skip
│     └── timestamp
│
└── LIVE mode
      ├── live state
      ├── play
      └── go live, if necessary
```

Do not duplicate the entire video-player implementation.

However, do not force VOD behavior onto Live playback.

Shared playback mechanics may be reused; navigation behavior must remain mode-specific.

---

# 20. Tests

Add tests for the new functionality where practical.

## URL classification

Test:

```text
/videos/<id> → VOD
/<channel>   → CHANNEL
invalid      → INVALID
```

## Live URL validation

Test:

* Valid Twitch channel URL.
* Invalid Twitch URL.
* Non-Twitch URL.
* Malformed URL.
* Attempted localhost URL.
* Attempted private/internal URL.

## Live status

Mock the Twitch API/resolution layer and test:

```text
LIVE
OFFLINE
NOT FOUND
ERROR
```

## Resolver

Test the resolver's handling of:

* Successful live resolution.
* Resolution failure.
* Missing playback information.
* Expired/invalid playback information.

Do not make automated tests depend on a real Twitch stream being live.

## Regression

Run all existing Phase 1 VOD tests after implementing Phase 2.

The existing VOD test suite must remain passing.

---

# 21. Manual Verification

The agent should perform a local end-to-end test using a currently live public Twitch channel when one is available.

Verify:

1. Open Witch.
2. Enter a Twitch channel URL.
3. Load the channel.
4. Witch detects that it is live.
5. Witch resolves the HLS source.
6. The HLS URL appears in the UI.
7. The HLS URL can be copied.
8. The video starts playing.
9. The UI clearly indicates `LIVE`.
10. VOD-specific controls are not displayed.
11. The stream remains at/near the live position.
12. Existing VOD playback still works afterward.

If no public channel is live during testing, document that limitation and run all available mocked/integration tests instead.

---

# 22. Documentation

Update `README.md` to include:

## Live support

Explain that Witch now supports:

```text
Twitch VOD
Twitch Live
```

Explain the difference:

```text
VOD
- Seeking
- Skip intervals
- Timestamp selection

LIVE
- Real-time playback
- No rewind
- No fast-forward
- No timestamp selection
```

Also document:

* How live resolution works at a high level.
* Whether Twitch credentials are required.
* Required environment variables.
* Known limitations.
* The fact that HLS URLs may expire.
* That live playback depends on Twitch's current playback infrastructure.

Do not document private credentials or sensitive tokens.

---

# 23. Definition of Done

Phase 2 is complete when:

* [ ] A Twitch channel URL can be entered into Witch.
* [ ] Witch correctly identifies it as a channel rather than a VOD.
* [ ] Witch determines whether the channel is live.
* [ ] Offline channels produce a clear offline message.
* [ ] Live channels are resolved to a playable HLS source.
* [ ] The HLS source is displayed in the UI.
* [ ] The HLS source can be copied.
* [ ] The live stream plays inside Witch's own player.
* [ ] The UI clearly indicates `LIVE`.
* [ ] VOD skip controls are not shown for Live.
* [ ] VOD timestamp controls are not shown for Live.
* [ ] No DVR functionality is implemented.
* [ ] Live stream termination is handled gracefully.
* [ ] Invalid URLs are rejected safely.
* [ ] The backend cannot be trivially abused as an SSRF proxy.
* [ ] Secrets remain server-side.
* [ ] Existing VOD functionality continues to work.
* [ ] Existing VOD tests pass.
* [ ] New Live-related tests pass.
* [ ] README documentation is updated.

---

# 24. Implementation Workflow

The coding agent should follow this order.

### Phase 2.1 — Inspect existing implementation

Understand the completed Phase 1 architecture before changing anything.

Identify:

* URL handling.
* VOD resolver.
* HLS player.
* API layer.
* Frontend player controls.
* Tests.

Do not refactor working code unless necessary.

### Phase 2.2 — Research Twitch Live

Investigate the current official and technical Twitch playback mechanisms.

Determine:

* Live detection.
* HLS resolution.
* Authentication requirements.
* CORS.
* Temporary URL behavior.
* Backend/frontend responsibilities.

### Phase 2.3 — Architecture decision

Document the selected Live resolution mechanism before implementing it.

### Phase 2.4 — URL classification

Add VOD vs channel URL classification while preserving existing VOD behavior.

### Phase 2.5 — Live resolver

Implement the smallest reliable Live resolver.

### Phase 2.6 — Live player mode

Extend the existing player to support a Live mode.

### Phase 2.7 — Live UI

Add:

* Live indicator.
* HLS source display.
* Copy button.
* Live-specific controls.

### Phase 2.8 — Error handling

Implement offline, unavailable, resolution failure, playback failure, and stream-ended states.

### Phase 2.9 — Security review

Verify URL validation and SSRF protections.

### Phase 2.10 — Testing

Run:

* New Live tests.
* Existing VOD tests.
* Application locally.

### Phase 2.11 — Documentation

Update README with Live support and limitations.

---

# 25. Important Agent Constraints

The coding agent MUST:

1. Treat Phase 1 VOD functionality as working and protected.
2. Research Twitch Live playback before implementing the resolver.
3. Prefer official Twitch APIs where they are appropriate and sufficient.
4. Keep Live resolution separate from VOD resolution.
5. Keep the application local-first.
6. Avoid introducing a database.
7. Avoid authentication unless technically required.
8. Avoid arbitrary URL fetching.
9. Prevent SSRF.
10. Keep credentials server-side.
11. Never bypass Twitch access controls.
12. Never implement downloading or recording as part of this phase.
13. Never add DVR/rewind functionality.
14. Never expose VOD-only controls during Live playback.
15. Keep the implementation minimal.
16. Preserve all Phase 1 behavior.

---

# 26. Expected Result

After Phase 2, Witch should conceptually support:

```text
                         WITCH
                           │
                    Twitch URL input
                           │
              ┌────────────┴────────────┐
              │                         │
         /videos/<id>              /<channel>
              │                         │
              ▼                         ▼
             VOD                    Is Live?
              │                    ┌────┴────┐
              │                   NO         YES
              │                    │          │
              │                 Offline       ▼
              │                              HLS
              ▼                               │
        VOD HLS Player                        │
              │                               │
      ┌───────┼────────┐                      │
      ▼       ▼        ▼                      ▼
    Skip   Timestamp  Seek              LIVE Player
                                           │
                                      ┌────┴────┐
                                      ▼         ▼
                                    Video    HLS URL
                                               │
                                             [Copy]
```

The key product distinction is:

> **VOD is a navigable recording. Live is simply a live stream.**

Phase 2 should add the latter without compromising the former.
