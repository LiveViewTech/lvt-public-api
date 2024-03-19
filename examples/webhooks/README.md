# Webhooks

LVT provides the ability to register webhooks to receive alerts via HTTP `POST` requests. Currently only security alert events are supported with potential for expansion in the
future.

Most of the REST API endpoints are just CRUD for the webhooks resource. The biggest difference is that the url being registered is validated upon creation or update. The validation
process can be manually executed (without creating any resources) using the `POST /webhooks:test` endpoint.

Once the webhook has been created, if the `enabled` field is `true`, the LVT system will immediately begin sending webhook events to the registered URL as they are received. If a
registered endpoint is unable to receive events (it does not respond with an HTTP 2XX response code), the LVT system will use an exponential backoff, waiting `attempt ^ 2` seconds
before the next attempt. If the registered endpoint does not respond successfully within 10 attempts, the endpoint is automatically disabled. There is currently no notification
sent upon the disabling of a webhook. A disabled webhook can be enabled again using the `PATCH /webhooks/{webhookId}` endpoint.

Note: All requests in this document are expected to be authenticated as described in the [root docs](../../README.md).

## Testing a webhook

Testing the webhook is typically the first step done while developing a webhook event receiver. A test event can be triggered using the `POST /webhooks:test` endpoint.

Example request for a validation test:

`HTTP POST /v1/webhooks:test`

```json
{
  "url": "https://receiver.webhooks.com/receiveWebhookEvent",
  "namespace": "securityAlerts"
}
```

_Note_: This is the simplest version of the request. It is intended to help develop the validation. Additional testing will be described below.

### Validation

The only two validations performed on this request are:

1. The `url` must be HTTPS. HTTP is explicitly disallowed.
2. The `namespace` must be a valid namespace. Currently, the only supported namespace is `"securityAlerts"` but the field is included to allow for future expansion.

### Request handling

The `/webhooks:test` endpoint just takes the request and immediately turns around and `POST`s the following message to the provided URL:

```json
{
  "attempt": 1,
  "currentAttemptTimestamp": "<CURRENT_TIME_AS_ISO_8601_TIMESTAMP>",
  "action": "test",
  "namespace": "securityAlerts",
  "data": {
    "message": "Hello, world!"
  }
}
```

The message is accompanied by two custom headers that should be validated when handling the request.

* `X-LVT-HMAC-SHA256`: An HMAC signature to verify the message authenticity
* `X-LVT-PUBKEY-URL`: A URL to fetch the public key of the key-pair used to sign the message

These headers should be used as described in the next section. Once the test request has been handled and received a response, the original request to `/webhooks:test` will respond
with a `204` if it received a successful response and a `400` if it was not successful. A `204` indicates that a `POST /webhooks` request should succeed.

#### Verifying the HMAC signature

To verify the HMAC, you will first need to fetch the public key from the URL provided in the header. The URL provided will always point the the `/publicKeys/{publicKeyId}` endpoint
of the API. As per the [API specification](../../api-specs/api.yaml), that endpoint returns `application/x-pem-file` contents. This means the key does not need to be extracted from
the response. Note that this endpoint _is_ authenticated. It is also recommended to cache this URL to help avoid hitting rate limits to the API.

Once the key has been fetched, the signature provided can be verified by using the public key, `SHA256` as the algorithm, base64 decoding, and the entire request body stringified as
the payload.

The following is a JavaScript example of a request handler function that may be used in an [Express application](https://expressjs.com/). Signature verification is done using
the [Node.js crypto library](https://nodejs.org/api/crypto.html#class-verify). Error checking has been omitted for brevity.

```js
const { createVerify } = require('node:crypto');

async function requestHandler(request, response) {
  const publicKeyUrl = request.get('X-LVT-PUBKEY-URL');
  const signature = request.get('X-LVT-HMAC-SHA256');

  // This request should be cached by the webhook consumer.
  const publicKeyRequest = await fetch(publicKeyUrl, {
    headers: {
      'Authorization': 'Bearer <<BEARER TOKEN>>'
    },
  });

  const publicKey = await publicKeyRequest.text();

  const verify = createVerify('SHA256');
  verify.update(JSON.stringify(request.body));
  verify.end();

  if (verify.verify(publicKey, signature, 'base64')) {
    console.log('Valid message received');
    res.sendStatus(204);
  } else {
    console.log('Invalid message received');
    res.sendStatus(403);
  }
}
```

### Testing specific actions

After signature validation has been developed and is working, it may be helpful to test specific messages. To help with this a few optional parameters have been added to the test
endpoint.

#### `action` query parameter

An `action` query parameter was added. If it is not included the `action` in the test message defaults to `test` and follows the behavior described above for signature
validation testing. When a valid `action` is provided, the `data` field of the test message will match the example section provided in the docs (with timestamps being generated at
the time of the request).

#### `data` request body field

Another optional parameter is a `data` field in the request body. This value must be an object, but is otherwise un-validated. Whatever is provided in this field will override the
`data` value in the test message. The intended usage of this behavior is as follows:

1. Copy the message schema for the type of message you are testing.
2. Modify the data to contain the values you need in your test.
3. Provide the modified data as the `data` field of the request body.
4. Handle the request in your development environment.

#### `mimeType` query parameter

This helper only affect the `mediaAvailable` action when no `data` field is provided. It toggles whether the media contains an image or a video (defaults to video). Valid values are 
`image/jpeg` and `video/mp4`. The IDs of the media for the image and video correspond to a real image and video that may be used for development.

## Creating a webhook

After a URL has been tested, the webhook can then be created. The create command is similar to the simple test command but it has an extra `enabled` field. The URL is tested
regardless of the `enabled` value. The only difference is that the URL will immediately receive event messages if `enabled` is `true`. A webhook can be enabled or disabled at any
time using the `PATCH /webhooks/{webhookId}` endpoint.

## Updating a webhook

The only difference from a typical REST `PATCH` command is that if the `url` is changed, or the `enabled` state is set from `false` to `true`, a test event must be responded to
with an HTTP `2XX` status code in order for the update operation to be executed.

## Error handling and retries

If a webhook message is sent and does not receive an HTTP `2XX` response, it will begin a retry loop with an exponential backoff. The backoff waits `attempt ^ 2` seconds for up to
10 attempts before the webhook is disabled.

**Every webhook message needs to receive a success status.** Each webhook message is sent through the retry loop individually, meaning if two messages are sent, the first one
receives a `500` error response and the second one receives a `200`, the first message will be retried and will potentially disable the webhook despite the fact that a later
message has been handled successfully.

## Consuming media

You may notice that the `media` schema does not include a URL. Media is only available with signed URLs. Signed URLs must be requested using the `GET /media/{mediaId}/url` endpoint
of the API.

## Message contents

All webhook messages will be wrapped with the following data:

| field                     | type             | description                                                                                            |
|---------------------------|------------------|--------------------------------------------------------------------------------------------------------|
| `action`                  | string           | The action that prompted the webhook message.                                                          |
| `attempt`                 | integer (1 - 10) | The number of times the webhook message has been sent.                                                 |
| `currentAttemptTimestamp` | ISO-8601 string  | The timestamp of the current attempt.                                                                  |
| `data`                    | object           | The data associated with the webhook message. This schema can be determined by the `action` field.     |
| `initialAttemptTimestamp` | ISO-8601 string  | The timestamp of the initial attempt. Only included if the current attempt is not the initial attempt. |
| `namespace`               | string           | The namespace of the registered webhook that triggered the event.                                      |

Example:

```json
{
  "action": "raised",
  "attempt": 3,
  "currentAttemptTimestamp": "2024-01-16T19:34:16.335Z",
  "data": {},
  "initialAttemptTimestamp": "2024-01-16T18:33:15.335Z",
  "namespace": "securityAlerts"
}
```

As previously mentioned, the current version of webhooks only supports a single `securityAlerts` namespace. Within that namespace there are several actions that can trigger a
webhook message.

| Action             | Description                                        |
|--------------------|----------------------------------------------------|
| `alertRaised`      | A new alert has been reported by a live unit.      |
| `alertTypeChanged` | The type of an alert has changed.                  |
| `eventRaised`      | A new event has been reported by a live unit.      |
| `mediaAvailable`   | Media associated with an alert has been uploaded.  |
| `noteAdded`        | A user has added a note to the event.              |
| `resolved`         | A user has resolved the event.                     |
| `userAssigned`     | A user has been assigned to investigate the event. |

The data in these messages reflects the schema of the `/events` endpoint of the API. The intent is to allow clients to aggregate a full event (as if queried through the
`GET /events/{eventId}` endpoint) through the series of webhook messages. To this end, messages will attempt to provide payloads with schemas that can be dropped into existing
arrays or can replace event or alert fields.

The schema of the `data` field can be determined based on the `action`. Details are described below.

_Note_: Custom types are described in the _Types_ section under the message descriptions.

### `eventRaised`

This should be the first message received in the context of an event. The `data` field matches the response of a `GET /alerts/{alertId}` request:

| Field          | Type            | Description                                                                           |
|----------------|-----------------|---------------------------------------------------------------------------------------|
| `alerts`       | array (`alert`) | A list of alerts raised during the event.                                             |
| `client`       | `client`        | Details about the client which owned the unit when the event was raised.              |
| `id`           | string (UUID)   | The unique identifier for the event.                                                  |
| `liveUnit`     | `liveUnit`      | Details about the live unit that raised the event.                                    |
| `location`     | `location`      | Details about the location the live unit was at when the event was raised.            |
| `notes`        | array (`note`)  | A list of notes describing the event.                                                 |
| `priority`     | string          | Text prioritization level of the event. Valid values are `high`, `medium`, and `low`. | 
| `resolution`   | `resolution`    | Details about the resolution of the event.                                            |
| `assignedUser` | `user`          | Details about the user assigned to investigate the event.                             |

Example `data` contents:

```json
{
  "id": "5c883582-e56a-11ee-bd3d-0242ac120002",
  "alerts": [],
  "client": {
    "id": "d4f2313e-e56b-11ee-bd3d-0242ac120002",
    "name": "LiveView Technologies"
  },
  "location": {
    "id": "dcbcb24a-e56b-11ee-bd3d-0242ac120002",
    "name": "HQ",
    "timezone": "America/Denver",
    "latitude": 40.123456,
    "longitude": -111.789
  },
  "liveUnit": {
    "id": "e0dd0618-e56b-11ee-bd3d-0242ac120002",
    "name": "Houston"
  },
  "notes": [],
  "resolution": null,
  "priority": "medium",
  "assignedUser": null
}
```

_Note_: `alerts` and `notes` are always expected to be empty arrays in an `eventRaised` message. `resolution` and `assignedUser` are also always expected to be `null`.

### `alertRaised`

After an event is raised, at least one alert will be raised.

| Field     | Type          | Description                               |
|-----------|---------------|-------------------------------------------|
| `alert`   | `alert`       | The alert object.                         |
| `eventId` | string (UUID) | The ID of the event the alert belongs to. |

The `alert` field can be appended to the `events[eventId].alerts` array.

Example `data` contents:

```json
{
  "eventId": "5c883582-e56a-11ee-bd3d-0242ac120002",
  "alert": {
    "id": "665a608a-e56a-11ee-bd3d-0242ac120002",
    "eventTime": "<CURRENT_TIME_AS_ISO_8601_TIMESTAMP>",
    "media": [],
    "alertType": {
      "id": "ee8ffd88-e56b-11ee-bd3d-0242ac120002",
      "name": "Test Alert"
    },
    "camera": {
      "id": "f4670742-e56b-11ee-bd3d-0242ac120002",
      "mountPosition": "center",
      "thermal": false,
      "viewType": "panoramic"
    }
  }
}
```

_Note_: `media` is always expected to be empty in an `alertRaised` message.

### `mediaAvailable`

A live unit raises an alert as it is uploading alert recordings and images. Once the media has successfully uploaded, a `mediaAvailable` message will be sent.

| Field     | Type          | Description                               |
|-----------|---------------|-------------------------------------------|
| `alertId` | string (UUID) | The ID of the alert the media belongs to. |
| `eventId` | string (UUID) | The ID of the event the alert belongs to. |
| `media`   | `media`       | The media object.                         |

The `media` field can be appended to the `events[eventId].alerts[alertId].media` array.

Example `data` contents:

```json
{
  "eventId": "5c883582-e56a-11ee-bd3d-0242ac120002",
  "alertId": "665a608a-e56a-11ee-bd3d-0242ac120002",
  "media": {
    "id": "bb4af400-e56b-11ee-bd3d-0242ac120002",
    "mimeType": "video/mp4",
    "timestamp": "<CURRENT_TIME_AS_ISO_8601_TIMESTAMP>",
    "camera": {
      "id": "f4670742-e56b-11ee-bd3d-0242ac120002",
      "mountPosition": "center",
      "thermal": false,
      "viewType": "panoramic"
    }
  }
}
```

_Note_: The media ID in the example can be used to view an actual test video using the `GET /media/{mediaId}` endpoint. `9c20e508-e575-11ee-bd3d-0242ac120002` can be used to view 
an actual test image using the same endpoint.

### `noteAdded`

During the investigation of an event, a user may add notes about the event. Notes are owned by an event and not by alerts.

| Field     | Type          | Description                              |
|-----------|---------------|------------------------------------------|
| `eventId` | string (UUID) | The ID of the event the note belongs to. |
| `note`    | `note`        | The note object.                         |

The `note` field can be appended to the `events[eventId].notes` array.

Example `data` contents:

```json
{
  "eventId": "5c883582-e56a-11ee-bd3d-0242ac120002",
  "note": {
    "id": "26daa4b8-e56c-11ee-bd3d-0242ac120002",
    "message": "This is a note",
    "user": {
      "id": "2be3bb16-e56c-11ee-bd3d-0242ac120002",
      "name": "John Doe"
    },
    "createdTime": "<CURRENT_TIME_AS_ISO_8601_TIMESTAMP>",
    "updatedTime": "<CURRENT_TIME_AS_ISO_8601_TIMESTAMP>"
  }
}
```

### `resolved`

When a resolution is posted, due to the asynchronous nature of the events, other messages such as media-available, alert-raised, etc., may still be received.

| Field        | Type          | Description                                    |
|--------------|---------------|------------------------------------------------|
| `eventId`    | string (UUID) | The ID of the event the resolution belongs to. |
| `resolution` | `resolution`  | The resolution object.                         |

The `resolution` field can replace the `events[eventId].resolution` property.

Example `data` contents:

```json
{
  "eventId": "5c883582-e56a-11ee-bd3d-0242ac120002",
  "resolution": {
    "name": "Authorities Dispatched",
    "resolvedTime": "<CURRENT_TIME_AS_ISO_8601_TIMESTAMP>",
    "user": {
      "id": "2be3bb16-e56c-11ee-bd3d-0242ac120002",
      "name": "John Doe"
    }
  }
}
```

### `alertTypeChanged`

If an alert is detected incorrectly, it may be changed after it has been raised.

| Field       | Type          | Description                                   |
|-------------|---------------|-----------------------------------------------|
| `alertId`   | string (uuid) | The ID of the alert the alertType belongs to. |
| `alertType` | `alertType`   | The alertType object.                         |
| `eventId`   | string (uuid) | The ID of the event the alert belongs to.     |

The `alertType` field can replace the `events[eventId].alerts[alertId].alertType` property.

Example `data` contents:

```json
{
  "eventId": "5c883582-e56a-11ee-bd3d-0242ac120002",
  "alertId": "665a608a-e56a-11ee-bd3d-0242ac120002",
  "alertType": {
    "id": "ee8ffd88-e56b-11ee-bd3d-0242ac120002",
    "name": "Test Alert"
  }
}
```

### `userAssigned`

A user may be assigned to investigate the event. When the user is assigned or a user is re-assigned, a webhook message is sent.

| Field          | Type          | Description                               |
|----------------|---------------|-------------------------------------------|
| `assignedUser` | `user`        | The user that was assigned to the event.  |
| `eventId`      | string (uuid) | The ID of the event the alert belongs to. |

The `assignedUser` field can replace the `events[eventId].assignedUser` property.

Example `data` contents:

```json
{
  "eventId": "5c883582-e56a-11ee-bd3d-0242ac120002",
  "assignedUser": {
    "id": "2be3bb16-e56c-11ee-bd3d-0242ac120002",
    "name": "John Doe"
  }
}
```

## Types

### `alert`

| Field       | Type              | Description                                            |
|-------------|-------------------|--------------------------------------------------------|
| `alertTime` | string (ISO-8601) | The timestamp at which the alert was triggered.        |
| `alertType` | `alertType`       | The classification of the alert.                       |
| `camera`    | `camera`          | Details about the camera that triggered the alert.     |
| `id`        | string (UUID)     | The unique identifier for the alert.                   |
| `media`     | array (`media`)   | A list of media captured when the alert was triggered. |

### `alertType`

| Field  | Type          | Description                                        |
|--------|---------------|----------------------------------------------------|
| `id`   | string (UUID) | The unique identifier for the alertType.           |
| `name` | string        | The name of the alert type. i.e. Animal Detection. |

### `camera`

| Field           | Type          | Description                                                                                                                                                      |
|-----------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`            | string (UUID) | The unique identifier for the camera.                                                                                                                            |
| `mountPosition` | string        | The position the camera is mounted on the live unit. Valid values are described in the [OpenApi specification](../../api-specs/api.yaml) in the `camera` schema. |
| `thermal`       | boolean       | Whether the camera is a thermal camera.                                                                                                                          |
| `viewType`      | string        | The type of view a camera has. Valid values are described in the [OpenApi specification](../../api-specs/api.yaml) in the `camera` schema.                       |

### `client`

| Field  | Type          | Description                           |
|--------|---------------|---------------------------------------|
| `id`   | string (UUID) | The unique identifier for the client. |
| `name` | string        | The name of the client.               |

### `liveUnit`

| Field  | Type          | Description                              |
|--------|---------------|------------------------------------------|
| `id`   | string (UUID) | The unique identifier for the live unit. |
| `name` | string        | The name of the live unit.               |

### `location`

| Field       | Type           | Description                                                        |
|-------------|----------------|--------------------------------------------------------------------|
| `id`        | string (UUID)  | The unique identifier for the location.                            |
| `latitude`  | number (float) | The GPS latitude value of the location.                            |
| `longitude` | number (float) | The GPS longitude value of the location.                           |
| `name`      | string         | The name of the location.                                          |
| `timezone`  | string         | The timezone identifier the location is in. i.e. `America/Denver`. |

### `media`

| Field       | Type               | Description                                   |
|-------------|--------------------|-----------------------------------------------|
| `camera`    | `camera`           | The camera that captured the media.           |
| `id`        | string (UUID)      | The unique identifier for the media.          |
| `mimeType`  | string (mime type) | The mime type of the media.                   |
| `timestamp` | string (ISO-8601)  | The timestamp of when the media was captured. |

### `note`

| Field         | Type              | Description                                      |
|---------------|-------------------|--------------------------------------------------|
| `createdTime` | string (ISO-8601) | The timestamp of when the note was created.      |
| `id`          | string (UUID)     | The unique identifier for the note.              |
| `message`     | string            | The contents of the note.                        |
| `updatedTime` | string (ISO-8601) | The timestamp of when the note was last updated. |
| `user`        | `user`            | The user who created the note.                   |

### `resolution`

| Field          | Type              | Description                                   |
|----------------|-------------------|-----------------------------------------------|
| `name`         | string            | Short name for the resolution type.           |
| `resolvedTime` | string (ISO-8601) | The timestamp of when the event was resolved. |
| `user`         | `user`            | The user who resolved the event.              |

### `user`

| Field  | Type          | Description                         |
|--------|---------------|-------------------------------------|
| `id`   | string (UUID) | The unique identifier for the user. |
| `name` | string        | The name of the user.               |
