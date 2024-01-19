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

Example request:

`HTTP POST /v1/webhooks:test`

```json
{
  "url": "https://receiver.webhooks.com/receiveWebhookEvent",
  "namespace": "securityAlerts"
}
```

### Validation

The only two validations performed on this payload are:

1. The `url` must be HTTPS. HTTP is explicitly disallowed.
2. The `namespace` must be a valid namespace. Currently the only supported namespace is `"securityAlerts"` but the field is included to allow for future expansion.

### Request handling

The `/webhooks:test` endpoint just takes the request and immediately turns around and `POST`s the following message to the provided URL:

```json
{
  "attempt": 1,
  "currentAttemptTimestamp": "<<current datetime as an ISO-8601 string>>",
  "action": "test",
  "data": {
    "message": "Hello, world!"
  }
}
```

The message is accompanied with two custom headers that should be validated when handling the request.

* `X-LVT-HMAC-SHA256`: An HMAC signature to verify the message authenticity
* `X-LVT-PUBKEY-URL`: A URL to fetch the public key of the key-pair used to sign the message

These headers should be used as described in the next section. Once the test request has been handled and received a response, the original request to `/webhooks:test` will respond
with a `204` if it received a successful response and a `400` if it was not successful. A `204` indicates that a `POST /webhooks` request should succeed.

#### Verifying the HMAC signature

To verify the HMAC, you will first need to fetch the public key from the URL provided in the header. The URL provided will always point the the `/publicKeys/{publicKeyId}` endpoint
of the API. As per the [API specification](../../api-specs/api.yaml), that endpoint returns `application/x-pem-file` contents. This means the key does not need to be extracted from
the response.

Once the key has been fetched, the signature provided can be verified by using the public key, `SHA256` as the algorithm, and the entire request body stringified as the payload.

The following is a JavaScript example of a request handler function that may be used in an [Express application](https://expressjs.com/). Signature verification is done using
the [Node.js crypto library](https://nodejs.org/api/crypto.html#class-verify). Error checking has been omitted for brevity.

```js
const { createVerify } = require('node:crypto');

async function requestHandler(request, response) {
  const publicKeyUrl = request.get('X-LVT-PUBKEY-URL');
  const signature = request.get('X-LVT-HMAC-SHA256');

  // This URL should be cached by the webhook consumer.
  const publicKeyRequest = await fetch(publicKeyUrl, {
    headers: {
      'Authorization': 'Bearer <<BEARER TOKEN>>'
    },
  });

  const publicKey = await publicKeyRequest.text();

  const verify = createVerify('SHA256');
  verify.update(JSON.stringify(request.body));
  verify.end();

  if (verify.verify(publicKey, signature)) {
    console.log('Valid message received');
    res.sendStatus(204);
  } else {
    console.log('Invalid message received');
    res.sendStatus(403);
  }
}
```

## Creating a webhook

After a URL has been tested, the webhook can then be created. The create command is similar to the test command but it has an extra `enabled` field. The URL is tested regardless of
the `enabled` value. The only difference is that the URL will immediately receive event messages if `enabled` is `true`. A webhook can be enabled or disabled at any time using
the `PATCH /webhooks/{webhookId}` endpoint.

## Updating a webhook

The only difference from a typical REST `PATCH` command is that if the `url` is changed, or the `enabled` state is set from `false` to `true`, a test event must be responded to
with an HTTP `2XX` status code in order for the update operation to be executed.

## Error handling and retries

If a webhook message is sent and does not receive an HTTP `2XX` response, it will begin a retry loop with an exponential backoff. The backoff waits `attempt^2` seconds for up to 10
attempts before the webhook is disabled.

**Every webhook message needs to receive a success status.** Each webhook message is sent through the retry loop individually, meaning if two messages are sent, the first one
receives a `500` error response and the second one receives a `200`, the first message will be retried and will potentially disable the webhook despite the fact that a later
message has been handled successfully.

## Message contents

All webhook messages will be wrapped with the following data:

| field                     | type             | description                                                                                            |
|---------------------------|------------------|--------------------------------------------------------------------------------------------------------|
| `attempt`                 | integer (1 - 10) | The number of times the webhook message has been sent.                                                 |
| `initialAttemptTimestamp` | ISO-8601 string  | The timestamp of the initial attempt. Only included if the current attempt is not the initial attempt. |
| `currentAttemptTimestamp` | ISO-8601 string  | The timestamp of the current attempt.                                                                  |
| `action`                  | string           | The action that prompted the webhook message.                                                          |
| `data`                    | object           | The data associated with the webhook message. This schema can be determined by the `action` field.     |

Example:

```json
{
  "attempt": 3,
  "initialAttemptTimestamp": "2024-01-16T18:33:15.335Z",
  "currentAttemptTimestamp": "2024-01-16T18:33:15.335Z",
  "action": "securityAlertRaised",
  "data": {}
}
```

As previously mentioned, the current version of webhooks only supports a single `securityAlerts` namespace. Within that namespace there are three actions that can trigger a webhook
message.

The data in these messages is intended to reflect the schema of the `/alerts` endpoint of the API.

* `securityAlertRaised` uses the same schema as a `GET /alerts/{alertId}` request.
* `securityAlertMediaAvailable` uses the same schema as a `media` item from the `securityAlert` schema.
* `securityAlertResolved` uses the same schema as a `resolution` field from the `securityAlert` schema.

### `securityAlertRaised`

When the `action` is `securityAlertRaised` you can expect the following schema:

| field                   | type                        | description                                                                                                                                                                                    |
|-------------------------|-----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`                    | integer (1 - 10)            | The unique identifier for the security alert.                                                                                                                                                  |
| `timestamp`             | string (IS0-8601 timestamp) | The timestamp of when the security alert was raised.                                                                                                                                           |
| `cameraId`              | string (UUID)               | The ID of the camera that triggered the security alert.                                                                                                                                        |
| `cameraRole`            | string                      | The role of the camera on the live unit (if it has one).                                                                                                                                       |
| `cause`                 | string                      | A category for the type of action that triggered the security alert.                                                                                                                           |
| `clientId`              | string (UUID)               | The ID of the client that owns the live unit.                                                                                                                                                  |
| `clientName`            | string                      | The name of the client that owns the live unit.                                                                                                                                                |
| `coordinates`           | object                      | GPS coordinates of the unit raising the security alert.                                                                                                                                        |
| `coordinates.latitude`  | float                       | The coordinate latitude value.                                                                                                                                                                 |
| `coordinates.longitude` | float                       | The coordinate longitude value.                                                                                                                                                                |
| `liveUnitId`            | string (UUID)               | The ID of the live unit raising the security alert.                                                                                                                                            |
| `liveUnitName`          | string                      | The user assigned name of the live unit raising the security alert.                                                                                                                            |
| `locationId`            | string (UUID)               | The ID of the location the live unit is assigned to.                                                                                                                                           |
| `locationName`          | string                      | The user assigned name of the location the live unit is assigned to.                                                                                                                           |
| `locationTimezone`      | string (ISO-8601 timestamp) | The local timezone of the live unit.                                                                                                                                                           |
| `media`                 | array                       | An array of media files associated with the security alert. (This will always be empty in the initial webhook message).                                                                        |
| `state`                 | string                      | The state of the security alert. (This will always be `unresolved` in the initial webhook message).                                                                                            |
| `subject`               | string                      | The subject of the security alert (if applicable). For example, if the `cause` is `intrusion` this field may indicate that the subject of the intrusion was a `human`, `animal`, or `vehicle`. |
| `resolution`            | object                      | The details about the security alert resolution. (This will always be `null` for the initial webhook message).                                                                                 |

Example `data` contents:

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "timestamp": "2023-12-08T17:04:43.164Z",
  "cameraId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "cameraRole": "primary",
  "cause": "loitering",
  "clientId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "clientName": "string",
  "coordinates": {
    "latitude": 40.123456,
    "longitude": -111.789
  },
  "liveUnitId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "liveUnitName": "string",
  "locationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "locationName": "string",
  "locationTimezone": "string",
  "media": [],
  "state": "unresolved",
  "subject": "human",
  "resolution": null
}
```

### `securityAlertMediaAvailable`

When the `action` is `securityAlertMediaAvailable` you can expect the following schema:

| field             | type                        | description                                                                                                                                                                                                                            |
|-------------------|-----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `securityAlertId` | string (UUID)               | The ID of the security alert the media is associated with.                                                                                                                                                                             |
| `cameraId`        | string (UUID)               | The ID of the camera that captured the media.                                                                                                                                                                                          |
| `cameraRole`      | string                      | The role of the camera that captured the media.                                                                                                                                                                                        |
| `mimeType`        | string                      | The mime type of the media.                                                                                                                                                                                                            |
| `timestamp`       | string (ISO-8601 timestamp) | The timestamp of when the media was captured.                                                                                                                                                                                          |
| `url`             | string                      | A signed URL to retrieve the media. This URL will only be valid for 2 hours. To fetch the media again after the link has expired, a `GET /alerts/{securityAlertId}` request needs to be made which will refresh the URLs of the media. |

Example `data` contents:

```json
{
  "securityAlertId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "cameraId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "cameraRole": "string",
  "mimeType": "image/jpeg",
  "timestamp": "2023-12-08T17:04:43.164Z",
  "url": "https://cdn.lvt.com/alerts/security/202/20230928150412/1121.jpg?Expires=1695924513&Key-Pair-Id=MZ1Z1ZZNSPSL2&Signature=3fWTV-M0bAdXiFhjbLSU~iMKDAcbHKxxZfEOZJT3t2031cfrqNWfizjxyilmSNiuxxq39vHPdQQO3cF9WKKpVcPczVFcTUbEAUyDVA12akUexegBomwPkf4PcJgnEQr~-vp6wtzUawYHPYpNaH32xSaWKGxqOleq-c8F~5~4kI6MjuFFZylKLAdzQ1Oan4ujlnBfpbQPWKU-pBT8FotaefzjAZLGtzUtR37oNRK0j687p6vZyQIqsg~r-MDY5ZJZBZk3G02Dl0LkpcpzHf-xI~IHGhlQ4B~9JLDeFLCLrvFC47sOww7We8J4QkI8RyuoetV3ChegywIHVM0U1qFT0Q__"
}
```

### `securityAlertResolved`

When the `action` is `securityAlertResolved` you can expect the following schema:

| field                       | type            | description                                                                        |
|-----------------------------|-----------------|------------------------------------------------------------------------------------|
| `securityAlertId`           | string (UUID)   | The ID of the security alert the media is associated with.                         |
| `tags`                      | array (string)  | A list of tags that the resolution was categorized with.                           |
| `userId`                    | ISO-8601 string | The ID of the user who resolved the security alert.                                |
| `resolveInitiatedTimestamp` | string          | The timestamp of when the security alert was resolved by the user.                 |
| `note`                      | object          | Additional notes left by the user describing the resolution.                       |
| `resolvedTimestamp`         | object          | The timestamp of when the security alert resolution was received by the live unit. |

Example `data` contents:

```json
{
  "securityAlertId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "tags": [
    "theft"
  ],
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "resolveInitiatedTimestamp": "2023-12-08T17:04:43.164Z",
  "note": "They stole the declaration of independence.",
  "resolvedTimestamp": "2023-12-08T17:04:43.164Z"
}
```
