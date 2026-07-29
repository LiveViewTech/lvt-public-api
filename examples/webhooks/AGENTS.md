## Context

Partner guide for registering HTTPS webhooks that receive `securityAlerts` notifications, verifying HMAC signatures, and handling retry/disable semantics plus per-action payloads.

## Tech

- REST CRUD under `/webhooks` plus `POST /webhooks:test`
- Headers: `X-LVT-HMAC-SHA256`, `X-LVT-PUBKEY-URL`
- Public key fetch: authenticated `GET /publicKeys/{publicKeyId}` → `application/x-pem-file`
- Namespace today: `securityAlerts` only

## Architecture

Test or create webhook → LVT POSTs signed JSON to partner URL → partner verifies signature with PEM from pubkey URL → on live traffic, non-2XX triggers `attempt^2` second backoff for up to 10 attempts then auto-disable. Actions include `eventRaised`, `alertRaised`, `mediaAvailable`, `noteAdded`, `resolved`, `alertTypeChanged`, `userAssigned` (`examples/webhooks/README.md`).

## Patterns

- DO: require HTTPS URLs; HTTP is rejected (`examples/webhooks/README.md`).
- DO: cache pubkey fetches to avoid rate limits; verify SHA256 over the stringified body (`examples/webhooks/README.md`).
- DO: fetch media via OpenAPI `GET /alerts/media/{mediaId}/url` (30-minute signed URL per root `README.md`).
- DON'T: trust `GET /media/{mediaId}/url` from this guide — it omits the `alerts` prefix present in `api-specs/api.yaml`.
- DON'T: assume disable notifications exist — none are sent when a webhook auto-disables.

## Key Files

- `examples/webhooks/README.md` — validation, HMAC sample, retries, message schemas
- `api-specs/api.yaml` — `/webhooks`, `/webhooks:test`, `/publicKeys/{publicKeyId}`, `/alerts/media/{mediaId}/url`
- `README.md` — alerts/events/media overview
