## Purpose

Public contract and partner guides for the LVT Public REST API — authenticate, manage live units/cameras/locations, stream video, consume security alerts via webhooks, and initiate talkdown.

## Project Snapshot

- Type: documentation / OpenAPI contract (no application runtime in-repo)
- Stack: OpenAPI 3.0.3 (`api-specs/api.yaml` v0.5.0 Beta), Markdown guides
- Base URL: `https://api.lvt.com/v1`
- Auth: OAuth2 client credentials → `https://api.lvt.com/oauth2/v1/token`
- Subdocs:
  - `api-specs/AGENTS.md`
  - `examples/webrtc/AGENTS.md`
  - `examples/webhooks/AGENTS.md`

## Commands

No package manifest, Makefile, or CI. Nothing to install, build, or test in this repo.

## Conventions

- Treat `api-specs/api.yaml` as the source of truth for paths, schemas, and scopes.
- Prefer OpenAPI paths over prose when README/example text conflicts (see Gotchas).
- Do not invent runtime/service behavior here — this repo does not contain the API implementation.
- Keep example snippets illustrative; they are not runnable packages.

## Directory Map

- `api-specs/` → see `api-specs/AGENTS.md`
- `examples/webrtc/` → see `examples/webrtc/AGENTS.md`
- `examples/webhooks/` → see `examples/webhooks/AGENTS.md`
- `README.md` → auth + RTSP streaming user guide

## Architecture

Partners obtain a Bearer token (README OAuth flow / OpenAPI `OAuth2` clientCredentials), call REST under `/v1`, keep streams alive with `:checkIn`, and optionally receive signed webhook POSTs. WebRTC adds a per-stream camera-relay WebSocket (`signalUrl`). Talkdown returns a separate `wssUrl` (`talkDownData` in `api-specs/api.yaml`).

## Gotchas

- **Media URL path mismatch:** OpenAPI + root README use `GET /alerts/media/{mediaId}/url`; `examples/webhooks/README.md` documents `/media/{mediaId}/url`. Use the OpenAPI path.
- **Stream keepalive:** `POST /streams/{streamId}:checkIn` — literal `:checkIn` suffix required; streams time out without check-in (`README.md`, `examples/webrtc/README.md`).
- **Webhook auto-disable:** non-2XX → `attempt^2` backoff up to 10 tries, then disable with no notify (`examples/webhooks/README.md`).
- **WebRTC path typo:** guide sometimes says `/camera/...`; OpenAPI is `/cameras/...`.
- **streamInfo casing:** `applicationName`, `streamName`, `sessionId` are case-sensitive (`examples/webrtc/README.md`).

## Key Files

- `README.md` — auth, RTSP, alerts overview
- `api-specs/api.yaml` — full OpenAPI contract
- `examples/webrtc/README.md` — WebRTC signaling walkthrough
- `examples/webhooks/README.md` — webhook HMAC, retries, payload actions
