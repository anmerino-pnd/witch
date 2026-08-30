# Witch — Twitch VOD Custom HLS Player

## 1. Project Overview

### Project name

`witch`

### Purpose

Witch is a small, local-first web application that allows a user to enter a Twitch VOD URL and watch that VOD inside Witch's own HTML5-based player.

The application must automatically resolve the Twitch VOD to a playable HLS `.m3u8` playlist using the most appropriate currently available technical approach. The user should not need to manually inspect Twitch's network requests or provide the `.m3u8` URL.

The player must provide custom controls focused on fast navigation through long VODs, including configurable skip intervals and direct timestamp seeking.

The project is intentionally small and should remain an MVP. It does not require accounts, a database, persistent server-side state, or a complex frontend framework.

---

## 2. Initial Project Setup

The project must be initialized inside a directory named:

```text
witch/
```

Use `uv` for Python project management.

The initial project should be equivalent to:

```bash
uv init --app --package --name witch --vcs none --description "A local-first Twitch VOD player with custom HLS navigation controls" --readme --author-from git --build-backend setuptools
uv venv
```

If the exact `uv init` flags differ in the installed `uv` version, use the current supported equivalent while preserving these requirements:

* Project name: `witch`
* Application project
* Packaged Python project
* `setuptools` build backend
* No automatic VCS initialization
* A project description must exist
* A `README.md` must exist
* A virtual environment must be created
* Python dependency management must use `uv`

Do not add unnecessary project-management tooling.

---

# 3. Product Goal

The core user flow must be:

```text
User
  │
  │ enters Twitch VOD URL
  ▼
Witch frontend
  │
  │ sends VOD URL to resolver
  ▼
Witch backend
  │
  │ resolves VOD playback information
  ▼
HLS .m3u8 playlist
  │
  ▼
HTML5 video player
  │
  ├── configurable backward skip
  ├── configurable forward skip
  ├── timestamp selector
  ├── play/pause
  └── normal seeking
```

The user should only need to know the public Twitch VOD URL.

Example input:

```text
https://www.twitch.tv/videos/2858768912
```

The user must NOT be required to provide:

```text
https://.../index-dvr.m3u8
```

---

# 4. Core Requirements

## FR-01 — Twitch VOD URL Input

The application MUST provide a simple input where the user can paste a Twitch VOD URL.

Example:

```text
https://www.twitch.tv/videos/2858768912
```

The UI must provide a clear action such as:

```text
Load VOD
```

The application should validate that the input is plausibly a Twitch VOD URL before attempting resolution.

At minimum, support URLs matching the Twitch VOD format:

```text
https://www.twitch.tv/videos/<vod-id>
```

The implementation may normalize common URL variations when appropriate.

---

## FR-02 — Automatic VOD Resolution

Witch MUST automatically resolve the supplied Twitch VOD URL to playable HLS information.

The user must not manually provide an `.m3u8` URL.

### Mandatory research requirement

Before implementing the resolver, the coding agent MUST investigate the current Twitch VOD playback mechanism.

The agent must research:

1. How Twitch currently resolves VOD playback information.
2. Whether Twitch exposes an official API or documented mechanism suitable for this purpose.
3. Whether an official Twitch API can provide the required playback information.
4. Whether obtaining the HLS playlist requires a Twitch client identifier, OAuth token, playback access token, GraphQL request, undocumented endpoint, or another mechanism.
5. Whether the mechanism is suitable for a small local application.
6. Browser CORS implications.
7. Whether the resulting HLS URLs are temporary/expiring.
8. Whether the approach works for VODs that are publicly accessible without requiring user authentication.
9. Relevant Twitch terms, technical restrictions, and practical limitations.
10. Whether the resolver should run in the backend rather than directly in the browser.

Do not assume that a previously discovered CloudFront `.m3u8` URL is permanent or that Twitch's internal endpoints will remain stable.

The agent must document the chosen approach and why it was selected.

### Resolver constraints

The resolver MUST:

* Accept a Twitch VOD URL or VOD ID.
* Resolve it to a playable HLS playlist or equivalent playback source.
* Return useful errors when resolution fails.
* Avoid exposing secrets to the frontend.
* Avoid hardcoding a specific VOD.
* Avoid hardcoding the `.m3u8` URL from the initial experiment.
* Avoid relying on browser DevTools behavior.
* Avoid scraping arbitrary Twitch pages if an appropriate official or technically superior mechanism exists.
* Keep Twitch-specific resolution logic isolated from the player implementation.

The exact resolver implementation is intentionally left to the agent after research.

---

# 5. HLS Playback

The VOD must be played inside Witch's own UI.

Do NOT use the official Twitch embedded player as the primary player.

The application should use an HTML5 `<video>` element.

If native browser HLS support is insufficient, use an appropriate HLS JavaScript library such as `hls.js`.

The agent must detect browser capabilities appropriately.

The player implementation must be isolated from Twitch URL resolution.

Conceptually:

```text
TwitchResolver
      │
      ▼
HLS URL
      │
      ▼
HLS Player Adapter
      │
      ▼
HTMLVideoElement
```

The player must expose enough state/control for the custom navigation UI.

At minimum:

* Play
* Pause
* Current playback time
* Total duration
* Seek
* Playback state
* Loading state
* Error state

---

# 6. Custom Skip Intervals

The application MUST support configurable skip intervals.

Do not hardcode only:

```text
-30s / +30s
```

Instead, the user should be able to define the intervals used by the navigation controls.

Example:

```text
Skip intervals

Backward:
[ 5 ] [ 15 ] [ 30 ]

Forward:
[ 5 ] [ 15 ] [ 30 ]
```

The exact UI design is up to the agent, but it must remain simple.

The resulting player could display:

```text
[-30s] [-15s] [-5s] [Play] [+5s] [+15s] [+30s]
```

### Behavior

When a skip button is pressed:

```text
newTime = currentTime ± interval
```

The resulting time MUST be clamped to the valid video range:

```text
0 <= currentTime <= duration
```

Skipping backward from the beginning must never result in a negative timestamp.

Skipping forward past the end must never exceed the duration.

---

# 7. Timestamp Selector

The player MUST provide a direct timestamp input mechanism.

The purpose is to allow the user to jump to a specific point in a long VOD without having to precisely drag the seek bar.

The UI should allow the user to enter:

```text
Hours : Minutes : Seconds
```

Example:

```text
[ 01 ] : [ 23 ] : [ 45 ]
             [ Go ]
```

This must seek the player directly to:

```text
01:23:45
```

### Requirements

* Hours must be supported.
* Minutes must be supported.
* Seconds must be supported.
* Input values must be validated.
* Invalid timestamps must produce a clear UI error.
* The target timestamp must not exceed the VOD duration.
* Seeking to `00:00:00` must work.
* Seeking to the exact duration must be handled safely.
* Leading zeros should be accepted.
* The implementation must not require the user to manually calculate total seconds.

The timestamp selector may be implemented as separate fields or an equivalent accessible UI.

---

# 8. Player Time Display

The player must display the current playback position and total duration.

Example:

```text
01:23:45 / 03:17:21
```

The time display should be easy to interact with so that the timestamp selector feels like a natural extension of the player.

The implementation should avoid making users rely exclusively on the mouse pointer/seek bar for navigation.

---

# 9. Local Storage

User-defined skip intervals MUST persist using browser `localStorage`.

Example conceptual storage:

```json
{
  "backward": [5, 15, 30],
  "forward": [5, 15, 30]
}
```

The exact storage schema is up to the implementation.

Requirements:

* Settings survive page reloads.
* Settings are local to the browser.
* No database is required.
* No user account is required.
* Corrupted or invalid localStorage values must not break the application.
* The application should fall back to sensible defaults when settings are missing or invalid.

The VOD itself does NOT need to be stored.

Do not persist playback history.

---

# 10. UI Requirements

The UI should be intentionally simple.

No frontend framework is required.

Preferred frontend technology:

```text
HTML5
CSS
Vanilla JavaScript
```

Do not introduce React, Vue, Angular, or another frontend framework unless research demonstrates a compelling reason.

The application should feel like a small utility rather than a commercial streaming platform.

Suggested layout:

```text
┌──────────────────────────────────────────────────┐
│ Twitch VOD URL                                   │
│ [ https://www.twitch.tv/videos/... ] [Load VOD] │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                                                  │
│                    VIDEO                         │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘

01:23:45 / 03:17:21

[-30s] [-15s] [-5s] [▶ / ❚❚] [+5s] [+15s] [+30s]

Timestamp:
[ 01 ] : [ 23 ] : [ 45 ] [Go]

Skip intervals:
Backward: [5] [15] [30]
Forward:  [5] [15] [30]
```

The exact visual design can differ, but simplicity is a hard requirement.

---

# 11. Backend Requirements

A small Python backend should be used where necessary to perform Twitch VOD resolution and avoid browser limitations.

The backend should expose a minimal API.

The exact endpoint structure is up to the agent, but a reasonable design is:

```text
POST /api/vod/resolve
```

Request:

```json
{
  "url": "https://www.twitch.tv/videos/2858768912"
}
```

Response should contain the information required by the frontend to initialize playback.

Do not expose Twitch credentials, client secrets, or other sensitive values to the browser.

If the selected Twitch resolution mechanism does not require a backend, the agent may simplify the architecture, but this decision must be justified by research.

---

# 12. Error Handling

The application must provide useful errors for at least:

### Invalid URL

```text
Invalid Twitch VOD URL.
```

### VOD cannot be resolved

```text
Unable to resolve this Twitch VOD.
```

### VOD unavailable

```text
This VOD is unavailable or cannot be accessed.
```

### HLS playback failure

```text
The VOD was found, but playback could not be started.
```

### Network failure

```text
Unable to contact the VOD resolver.
```

Errors should be visible to the user without exposing sensitive implementation details.

Developer-facing logs may contain more diagnostic information.

---

# 13. Security Requirements

Security is important even though this is a small local application.

## SSRF prevention

The backend MUST NOT blindly fetch arbitrary URLs supplied by the user.

The VOD input must first be validated as an allowed Twitch VOD URL.

Do not create a generic endpoint such as:

```text
GET /fetch?url=<arbitrary-url>
```

that causes the server to request any URL supplied by the user.

Only supported Twitch VOD URLs should be accepted.

The implementation must prevent requests to:

* `localhost`
* `127.0.0.1`
* private IP ranges
* link-local addresses
* arbitrary internal hostnames
* cloud metadata endpoints
* arbitrary external domains

unless explicitly required by the selected Twitch resolution mechanism and justified in the implementation plan.

## Secrets

If Twitch credentials or API credentials are required:

* Keep them server-side.
* Load them from environment variables.
* Never hardcode them.
* Never return them to the frontend.
* Never commit them to Git.

Provide a `.env.example` if environment variables are required.

## Input validation

Validate:

* URL format
* Twitch hostname
* VOD ID format
* skip interval values
* timestamp values

Never trust user-provided values.

## Dependency security

Use maintained dependencies.

Do not add dependencies merely for convenience.

The agent must prefer standard-library functionality when reasonable.

---

# 14. Privacy

The MVP should be local-first.

The application must NOT require:

* user accounts
* registration
* cookies for application identity
* a database
* analytics
* telemetry
* tracking
* server-side playback history

Skip interval settings should remain in browser `localStorage`.

The application should not store VOD URLs unless explicitly required for the current session.

---

# 15. Non-Goals

The following are explicitly OUT OF SCOPE for the MVP:

* Twitch account authentication.
* User accounts.
* Database integration.
* Playback history.
* Favorites.
* Playlists.
* VOD downloading.
* VOD recording.
* Video transcoding.
* Video editing.
* Clip creation.
* Twitch chat integration.
* Twitch emotes.
* Streamer profiles.
* Channel browsing.
* Search across Twitch.
* Live-stream playback unless it naturally falls out of the chosen architecture and requires no additional complexity.
* Multi-user deployment.
* Cloud hosting infrastructure.
* Mobile native applications.
* Desktop native applications.
* Complex UI frameworks.
* Server-side storage of VODs.
* Circumventing private, restricted, or authentication-protected Twitch content.

Do not expand the project beyond the MVP without explicit approval.

---

# 16. Architecture Guidelines

Prefer a small architecture.

A reasonable structure is:

```text
witch/
├── README.md
├── pyproject.toml
├── .gitignore
├── .env.example          # only if needed
├── src/
│   └── witch/
│       ├── __init__.py
│       ├── ...
│       └── ...
└── tests/
    └── ...
```

Frontend assets may be placed inside the Python package and served by the backend.

The exact structure may be adjusted if the selected implementation requires it.

Avoid premature abstractions.

The resolver should be isolated from:

* HTTP API handling
* HTML UI
* HLS playback
* localStorage logic

This separation is important because Twitch's resolution mechanism is the component most likely to change in the future.

---

# 17. Twitch Resolution Research

Before writing the resolver implementation, the agent MUST perform technical research.

The research should answer:

### A. Official APIs

Determine whether Twitch's official APIs provide enough information to resolve a public VOD into a playable HLS playlist.

### B. Playback mechanism

Determine how the current Twitch web player obtains playback information.

### C. Authentication

Determine whether public VOD playback requires:

* Twitch OAuth
* Client-ID
* access token
* playback access token
* anonymous access
* another mechanism

### D. Browser limitations

Determine whether the `.m3u8` can be retrieved directly by the browser.

Investigate:

* CORS
* cookies
* headers
* temporary URLs
* signed URLs
* browser security policies

### E. Backend architecture

Determine whether resolution should happen:

```text
Browser → Twitch
```

or:

```text
Browser → Witch backend → Twitch
```

and explain the decision.

### F. Stability

Determine whether the chosen method is:

* documented
* officially supported
* semi-documented
* undocumented/internal
* likely to change

The implementation should favor the most stable and appropriate option.

### G. Legal/Terms constraints

Review relevant Twitch documentation and terms applicable to the selected mechanism.

The application must not be designed to bypass access controls or obtain content that the user is not authorized to access.

### Research output

Before implementation, record the important findings in the project documentation or implementation plan.

Do not silently choose a Twitch endpoint based solely on a random blog post or outdated Stack Overflow answer.

---

# 18. Testing Requirements

The MVP should include automated tests for the backend logic where practical.

At minimum, test:

### URL validation

* Valid Twitch VOD URL.
* Invalid Twitch URL.
* Non-Twitch URL.
* Malformed URL.
* Arbitrary URL attempting SSRF.

### Timestamp conversion

Test:

```text
00:00:00 → 0
00:00:30 → 30
01:00:00 → 3600
01:23:45 → 5025
```

### Timestamp validation

Test:

* Negative values.
* Invalid minutes.
* Invalid seconds.
* Empty fields.
* Timestamp beyond duration.

### Skip calculations

Test:

```text
currentTime = 100
skip = -30
result = 70
```

and boundary cases:

```text
currentTime = 10
skip = -30
result = 0
```

```text
currentTime = duration - 10
skip = +30
result = duration
```

### Settings

Test:

* Default settings.
* Saving settings.
* Loading settings.
* Invalid localStorage data.
* Missing localStorage data.

Frontend behavior may be tested manually if adding a browser test framework would create disproportionate complexity for this MVP.

---

# 19. Acceptance Criteria

The implementation is considered complete only when all of the following are true.

## AC-01 — Project initialization

A working `uv` Python application named `witch` exists with:

* `pyproject.toml`
* `README.md`
* Python package
* virtual environment support
* setuptools build backend

## AC-02 — VOD URL input

The user can paste:

```text
https://www.twitch.tv/videos/2858768912
```

and initiate loading without providing an `.m3u8` URL.

## AC-03 — VOD resolution

Witch automatically resolves the supplied public Twitch VOD into a playable HLS source using the researched implementation.

The implementation does not rely on a hardcoded `.m3u8`.

## AC-04 — Custom player

The VOD plays inside Witch's own HTML5-based player.

The Twitch embedded player is not required for playback.

## AC-05 — Playback controls

The user can:

* play
* pause
* seek
* see current time
* see total duration

## AC-06 — Custom skip intervals

The user can configure skip intervals instead of being restricted to a fixed ±30 seconds.

The configured intervals work for both forward and backward navigation.

## AC-07 — Timestamp seeking

The user can enter:

```text
HH:MM:SS
```

and jump directly to that position.

## AC-08 — Persistent settings

Skip interval settings persist across page reloads through `localStorage`.

No database is used.

## AC-09 — Error handling

Invalid URLs, resolution failures, unavailable VODs, network failures, and playback errors produce understandable user-facing messages.

## AC-10 — Security

The backend cannot be trivially abused as an arbitrary URL fetcher.

Secrets are not exposed to the frontend.

User input is validated.

## AC-11 — Tests

Automated tests cover the important URL validation, timestamp, skip, and settings logic.

## AC-12 — Documentation

`README.md` explains:

* What Witch is.
* Requirements.
* How to install dependencies with `uv`.
* How to run the application.
* How to configure required environment variables, if any.
* How the Twitch VOD resolver works at a high level.
* Known limitations.
* How to run tests.

---

# 20. Development Workflow

The coding agent should follow this order:

### Phase 1 — Inspect

Inspect the newly initialized repository and verify the environment.

### Phase 2 — Research

Investigate the current Twitch VOD playback/resolution mechanism.

Do NOT implement the resolver before this research.

### Phase 3 — Decide

Document the selected resolution mechanism and architecture.

If multiple viable approaches exist, compare them and select the simplest stable option.

### Phase 4 — Implement foundation

Create the Python application structure and minimal backend.

### Phase 5 — Implement resolver

Implement Twitch VOD URL → playable HLS source resolution.

### Phase 6 — Implement player

Implement HTML5/HLS playback.

### Phase 7 — Implement navigation

Add:

* custom skip intervals
* backward buttons
* forward buttons
* timestamp selector
* current/total time display

### Phase 8 — Persistence

Add `localStorage` persistence for skip intervals.

### Phase 9 — Error handling

Handle resolution, network, validation, and playback failures.

### Phase 10 — Tests

Add and run the relevant automated tests.

### Phase 11 — Documentation

Complete `README.md`.

### Phase 12 — Verification

Run the application locally and manually verify the complete user flow.

---

# 21. Definition of Done

Witch is DONE when a user can perform the following without technical knowledge:

1. Start the application locally.
2. Open the web UI.
3. Paste a Twitch VOD URL.
4. Click `Load VOD`.
5. The application resolves the VOD automatically.
6. The VOD begins playing inside Witch.
7. The user can pause/play.
8. The user can jump backward and forward using custom intervals.
9. The user can modify those intervals.
10. The settings remain after refreshing the page.
11. The user can enter an exact `HH:MM:SS` timestamp.
12. The player jumps directly to that timestamp.
13. Invalid input produces a useful error rather than crashing.
14. No database or user account is required.

---

# 22. Implementation Principles

The agent MUST follow these principles:

1. **Research before implementation.**
   Do not guess how Twitch currently exposes VOD playback.

2. **Keep it small.**
   This is an MVP utility, not a streaming platform.

3. **Prefer simple technologies.**
   HTML5, CSS, vanilla JavaScript, and a lightweight Python backend are preferred.

4. **Separate Twitch resolution from playback.**
   Twitch-specific logic should be isolated so it can be replaced if Twitch changes its implementation.

5. **Do not expose secrets.**

6. **Do not create an SSRF primitive.**

7. **Do not bypass access controls.**

8. **Do not add unnecessary dependencies.**

9. **Do not introduce a database.**

10. **Do not introduce authentication.**

11. **Do not implement features outside the MVP scope.**

12. **Make completion testable.**
    Every major requirement should be verifiable through the acceptance criteria.

---

# 23. Agent Instruction

You are implementing this project from this specification.

Treat this document as the source of truth for the MVP.

Before making implementation decisions involving Twitch VOD resolution, perform current technical research and document the relevant findings.

Do not ask the user to provide the `.m3u8` URL.

Do not hardcode the example VOD.

Do not assume undocumented Twitch behavior is permanent.

If the researched approach has an important limitation, document it clearly and implement the safest reasonable fallback rather than silently working around the limitation.

Do not expand the project scope.

At the end of implementation, provide:

1. A concise summary of the architecture.
2. The Twitch VOD resolution approach selected and why.
3. Files created or modified.
4. Dependencies added.
5. Environment variables required, if any.
6. Tests executed and their results.
7. Known limitations.
8. Exact command(s) required to run Witch locally.
