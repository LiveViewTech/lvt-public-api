## Context

Partner guide for streaming an LVT camera over WebRTC via the public API start-stream response and a camera-relay WebSocket signal server. TypeScript samples are illustrative only (not a package).

## Tech

- Browser WebRTC (`RTCPeerConnection`, `RTCSessionDescription`, `RTCIceCandidate`)
- WebSocket signaling to `signalUrl` from start-stream
- REST: `POST /cameras/{cameraId}/streams` with `{ protocol: 'webrtc' }`, then `:checkIn` / `DELETE /streams/{streamId}`

## Architecture

1. Start stream → `streamId`, `refreshInterval`, `signalUrl`, `streamInfo`
2. Interval `POST /streams/{streamId}:checkIn`; `DELETE` on unload
3. Open WebSocket to `signalUrl`; `getOffer` / handle 502|504 retry / accept SDP / send local SDP / add UDP ICE
4. Attach `track` event stream to a video element

## Patterns

- DO: keep `streamInfo.applicationName`, `streamName`, `sessionId` casing intact (`examples/webrtc/README.md`).
- DO: prefer UDP ICE candidates over TCP (guide notes TCP retransmission delay).
- DO: use `/cameras/{cameraId}/streams` as in OpenAPI and the working curl/axios samples.
- DON'T: copy prose that says `POST /camera/{cameraId}/streams` — singular `camera` is a doc typo vs `api-specs/api.yaml`.
- DON'T: skip check-in; streams time out without it.

## Key Files

- `examples/webrtc/README.md` — full walkthrough + combined example + firewall link
- `api-specs/api.yaml` — `/cameras/{cameraId}/streams`, `/streams/{streamId}:checkIn`, `/streams/{streamId}`
- `README.md` — RTSP sibling flow and check-in semantics
