## Context

Canonical OpenAPI 3.0.3 contract for the LVT Public REST API (info version 0.5.0, description Public REST API - Beta). Partners and codegen should follow this file over conflicting prose.

## Tech

- OpenAPI 3.0.3 YAML
- Server: `https://api.lvt.com/v1`
- Security scheme: `OAuth2` clientCredentials at `https://api.lvt.com/oauth2/v1/token`
- Scopes declared: `account.liveUnits.manage`, `account.cameras.manage`, `account.locations.manage`

## Architecture

Resource groups in `paths`: `liveUnits`, `cameras` (+ `streams`), `locations`, `alerts/events` + `alerts/media`, `webhooks`, `publicKeys`. Colon RPC actions include `:checkIn`, `:call`, `:play`, `:toggle`, `:test`, `:addNote`, `:resolve`, `:assignUser`. Shared `components` hold schemas, parameters, requestBodies, and error responses.

## Patterns

- DO: use operation `security` scopes when present (e.g. camera routes → `account.cameras.manage` in `api-specs/api.yaml`).
- DO: model pagination via shared `count`/`cursor` parameters (`#/components/parameters/...`).
- DON'T: assume every path lists scopes — many ops (alerts, webhooks, talkdown `:call`, lights/sounds) omit per-op `security` and fall through to global `OAuth2: []`.
- DON'T: invent tags — top-level `tags` omit Events/Media/Streams even though some operations use those tag names.

## Key Files

- `api-specs/api.yaml` — sole artifact in this directory
- Cross-ref: `README.md` for human auth/streaming walkthrough
- Cross-ref: `examples/webrtc/README.md`, `examples/webhooks/README.md` for protocol detail
