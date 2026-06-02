# LVT Partner Talkdown — API Client Usage Guide

This guide describes how an API partner can initiate a real-time two-way audio
talkdown session with an LVT LiveUnit using the LVT Public REST API and the
Partner Talkdown WebSocket service.

---

## Overview

A talkdown session allows a remote operator to broadcast live audio to the
speaker on an LVT LiveUnit. The flow has three stages:

```
Partner Client
    │
    │  1. POST /v1/liveUnits/{liveUnitId}:call        (REST – LVT Public API)
    │     → returns { callId, wssUrl }
    │
    │  2. Connect WebSocket to wssUrl                 (WSS – Partner Talkdown)
    │     → Authorization: Bearer <token>
    │
    │  3. Stream raw audio bytes over the WebSocket   (mulaw 8 kHz mono)
    │     → close the socket to end the session
```

The LVT Public API base URL is `https://api.lvt.com/v1`.

---

## 1. LVT-API Authentication

Onboarding to the LVT-API is covered in the main readme at the [lvt-public-api](https://github.com/LiveViewTech/lvt-public-api) repository.

The following step assumes you have gathered an ACCESS_TOKEN using the OAuth2 handshake process described by lvt-public-api's docs.

---

## 2. Discover Your Live Units

Use the live units endpoint to retrieve an IDs of the LiveUnit to which you want to stream live audio.

```bash
curl --request GET \
  --url https://api.lvt.com/v1/liveUnits \
  --header 'accept: application/json' \
  --header 'authorization: Bearer <ACCESS_TOKEN>'
```

**Response:**

```json
{
  "items": [
    {
      "id": "52a14680-6485-013c-5d2f-46744d1e8e0e",          <------------
      "clientId": "f8caaf01-e6ad-11ec-b547-065c38c63899",
      "name": "Unit Alpha – Parking Lot A",
      "locationId": "ab123456-0000-0000-0000-000000000001",
      "gpsLocation": { "latitude": 40.3774, "longitude": -111.7924 }
    }
  ],
  "cursor": null
}
```

Note the `id` field of the unit you want to call — this is the `liveUnitId`.

---

## 3. Initiate a Talkdown Session

Send a `POST` to the talkdown endpoint. An optional `securityEventId` body
field can be included to associate the talkdown with a specific security event.

### Request

```bash
curl --request POST \
  --url 'https://api.lvt.com/v1/liveUnits/52a14680-6485-013c-5d2f-46744d1e8e0e:call' \
  --header 'accept: application/json' \
  --header 'authorization: Bearer <ACCESS_TOKEN>' \
  --header 'content-type: application/json' \
  --data '{
    "securityEventId": "104BC3A1-85C7-4C78-93DD-6B2140F9613C"
  }'
```

> `securityEventId` is optional. Omit the `--data` flag (or send an empty
> object `{}`) if you do not have one.

### Response `200 OK`

```json
{
  "callId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "wssUrl": "wss://talkdown.api.lvt.com/ws/partner?callId=3fa85f64-5717-4562-b3fc-2c963f66afa6&liveUnitId=52a14680-6485-013c-5d2f-46744d1e8e0e"
}
```

| Field    | Description                                               |
|----------|-----------------------------------------------------------|
| `callId` | Unique identifier for this talkdown session.              |
| `wssUrl` | The WebSocket URL to connect to for streaming audio.      |

**Error responses:**

| HTTP Status | Meaning                                                            |
|-------------|--------------------------------------------------------------------|
| `400`       | Invalid `liveUnitId` format or malformed request body.             |
| `403`       | Your client is not authorized to access the specified LiveUnit.    |
| `500`       | Internal error — the downstream Speaker TalkDown service failed.   |

---

## 4. Connect the Audio WebSocket

Open a WebSocket connection to the `wssUrl` returned in the previous step.
Include your bearer token in the `Authorization` header.

### Connection Details

| Property         | Value                                                  |
|------------------|--------------------------------------------------------|
| Protocol         | `wss://`                                               |
| Auth header      | `Authorization: Bearer <ACCESS_TOKEN>`                 |
| URL format       | `<wssUrl from step 3>`                                 |

There is no initial handshake message — the server is ready to receive audio
immediately after the connection is established.

> **Timing note:** There is a small delay between when the WebSocket connection
> is accepted and when the call service is ready to receive audio on the other end.
> Audio sent in the first few hundred milliseconds may be buffered and played
> slightly late. A short pause before starting to speak improves the
> listener experience.

### Session expiry

If the WebSocket connection is not established within **60 seconds** of calling
the `POST :call` endpoint, the pending session is automatically cleaned up and
the `callId` becomes invalid. You must start a new session.

---

## 5. Stream Audio

Send audio as **raw binary WebSocket messages** (not text frames). The audio
must be encoded in the following format:

| Parameter      | Value                     |
|----------------|---------------------------|
| Encoding       | µ-law (mulaw / PCMU)      |
| Sample rate    | 8,000 Hz                  |
| Channels       | Mono (1 channel)          |
| Bit depth      | 8-bit (standard mulaw)    |
| Chunk size     | ≈ 800 bytes per message   |
| Chunk interval | 100 ms between each send  |

> 8,000 samples/sec × 1 byte/sample × 0.1 sec = **800 bytes per chunk**.

Sending chunks at 100 ms intervals prevents buffer overruns while keeping
latency low. Larger bursts will be buffered and played sequentially.

### TypeScript / Node.js example

This is a sample implementation; Note that the input file is presumed to already be encoded as Mulaw at 8khz mono.

```typescript
import fs from 'fs';
import WebSocket from 'ws';

const ACCESS_TOKEN = process.env.ACCESS_TOKEN!;
const wssUrl = '<wssUrl from POST :call response>';
const audioFilePath = './audio/message.ulaw'; // mulaw 8 kHz mono

async function runTalkdown(wssUrl: string, audioFilePath: string): Promise<void> {
  const socket = await connectWebSocket(wssUrl, ACCESS_TOKEN);
  try {
    await streamAudio(socket, audioFilePath);
  } finally {
    socket.close();
  }
}

function connectWebSocket(url: string, token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

async function streamAudio(socket: WebSocket, filePath: string): Promise<void> {
  const audio = fs.readFileSync(filePath);
  const CHUNK_MS = 100;
  const CHUNK_BYTES = CHUNK_MS * 8; // 800 bytes @ 8 kHz mulaw

  for (let offset = 0; offset < audio.byteLength; offset += CHUNK_BYTES) {
    await sleep(CHUNK_MS);
    const chunk = audio.subarray(offset, offset + CHUNK_BYTES);
    socket.send(chunk);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runTalkdown(wssUrl, audioFilePath).catch(console.error);
```

---

## 6. End the Session

**Close the WebSocket connection** to end the talkdown. The Partner Talkdown
service waits for all buffered audio to be acknowledged by the downstream
telephony layer before closing the connection to the LiveUnit.

```typescript
socket.close();
```

Do not rely on network timeouts to terminate the session — always close the
socket explicitly when the operator is done speaking.

---

## 7. Full End-to-End Flow Summary

```
1. Obtain OAuth2 token
   POST https://api.lvt.com/oauth2/v1/token
   scope: account.liveUnits.manage

2. (Optional) List live units to find liveUnitId
   GET  https://api.lvt.com/v1/liveUnits

3. Start talkdown session
   POST https://api.lvt.com/v1/liveUnits/{liveUnitId}:call
   Body (optional): { "securityEventId": "<eventId>" }
   → Response: { "callId": "...", "wssUrl": "..." }

4. Connect WebSocket
   wss://<wssUrl from step 3>
   Header: Authorization: Bearer <token>

5. Send audio over WebSocket
   Binary frames, mulaw 8 kHz mono, ~800 bytes/chunk, 100 ms interval

6. Close WebSocket to end the session
```

---

## 8. Error Handling

### HTTP errors (POST :call)

```typescript
try {
  const rsp = await axios.post(callUrl, body, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return rsp.data; // { callId, wssUrl }
} catch (err) {
  if (axios.isAxiosError(err)) {
    console.error(`HTTP ${err.response?.status}: ${err.response?.data?.errorSummary}`);
  }
  throw err;
}
```

### WebSocket errors and closure

The server may send a JSON text frame on the WebSocket before closing the
connection if an error occurs (e.g., unauthorized access, bad LiveUnit ID).

```typescript
socket.on('message', (data) => {
  // The service only sends text frames for errors.
  try {
    const msg = JSON.parse(data.toString());
    if (msg.errorCode) {
      console.error(`Talkdown error ${msg.errorCode}: ${msg.errorSummary}`);
    }
  } catch {
    // non-JSON — ignore
  }
});

socket.on('close', (code, reason) => {
  console.log(`WebSocket closed: code=${code} reason=${reason.toString()}`);
});
```

**Common WebSocket error codes:**

| errorCode | Meaning                                              |
|-----------|------------------------------------------------------|
| `401`     | Bearer token missing or invalid.                     |
| `403`     | Client not authorized for the specified LiveUnit.    |
| `404`     | Unrecognized WebSocket URL path.                     |
| `500`     | Unexpected server error.                             |

---

## 9. Audio Format Reference

LVT LiveUnits use media streams encoded as
**µ-law (mulaw) compressed audio at 8 kHz**. Most telephony toolkits support
this format out of the box.

### Converting audio with ffmpeg

```bash
# Convert any audio file to mulaw 8 kHz mono .ulaw
ffmpeg -i input.wav -ar 8000 -ac 1 -f mulaw output.ulaw

# Convert to raw mulaw (same as .ulaw)
ffmpeg -i input.mp3 -ar 8000 -ac 1 -acodec pcm_mulaw -f mulaw output.ulaw
```

### Generating test audio with sox

```bash
# Generate 3 seconds of a 440 Hz tone in mulaw format
sox -n -r 8000 -c 1 -e u-law test.ulaw synth 3 sine 440
```


