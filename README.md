# Witch — Twitch VOD Custom HLS Player

![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![uv](https://img.shields.io/badge/uv-000000?style=flat-square&logo=python&logoColor=white)

Witch is a small, local-first web application that allows a user to enter a Twitch VOD URL and watch that VOD inside Witch's own HTML5-based player.

## Requirements

- Python 3.13+
- `uv` package manager

## Installation

This project is built using `uv`. To install dependencies:

```bash
uv sync
```

## Running the Application

To start the local server, run:

```bash
uv run witch
```

Then, open your browser and navigate to `http://localhost:8000/`.

## Environment Variables

This MVP does not require any additional environment variables. The application uses the public Twitch Web Client ID.

## Architecture & VOD Resolution

Twitch's VOD mechanism works by:

1. Sending a GraphQL request to `https://gql.twitch.tv/gql` to retrieve a `PlaybackAccessToken`.
2. Using the token and its signature to request the master `.m3u8` playlist from Twitch's Usher API (`https://usher.ttvnw.net`).

To bypass browser CORS limitations when interacting with the Usher API and CloudFront, Witch implements a lightweight local Python proxy (`http.server`) that resolves the VOD, fetches the `m3u8` playlists, rewrites relative chunks to proxy URLs, and serves the chunks back to the frontend.
The frontend uses `hls.js` to play the video seamlessly.

## Tests

Testing covers basic URL validation and timestamp logic (these can be found within manual frontend testing). Since this is an MVP without complex backend business logic, automated tests were not overly engineered, though the core resolver is abstracted into `server.py` allowing easy unit testing if needed.

## Known Limitations

- The proxy mechanism will download video chunks through the Python backend. While functional for a local MVP, this might cause slight latency compared to direct browser downloads.
- Subscriber-only or restricted VODs are not supported, as this app only fetches public tokens.
