# Partner Talkdown Service - Example Client

Partner Talkdown service provides an API for LVT Partners to easily create
Talkdown sessions to their Live Units.  It has a REST API for initiating a call
session and a WebSocket server for sending audio bytes to be forwarded to the
Live Unit. The audio must be encoded as byte arrays of mono, Mulaw-encoded
audio packets with a sample rate of 8KHz.  To end the Talkdown session, the LVT
Partner need only close the WebSocket.

This folder provides a sample client for connecting to the LVT Partner Talkdown
service and sending Mulaw-encoded audio from a file (sample included).

## Setup
```
npm install
npm install -g ts-node
```

## Configure
```
  cp env.partner .env
  vim .env
```
Make sure to set the liveUnitId parameter in the `PTD_URL` setting.

## Obtain an Auth token
Replace `CLIENT_ID` and `SECRET` with your client credentials.
```
  ts-node src/getAuthToken.ts -c CLIENT_ID -s SECRET >> .env
```

## Run the test client that sends audio to a LiveUnit speaker
```
  ts-node src/partnerClient.ts
```
