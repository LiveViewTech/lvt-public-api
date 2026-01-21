# LVT PARTNER API DOCUMENTATION

**Overview:** This document shows the use case, setup, and troubleshooting for LVT's Partner API.

## VERSION 1.0.0

> **Note:** The key words "MUST," "MUST NOT," "REQUIRED," "SHALL," "SHALL NOT," "SHOULD," "SHOULD NOT," "RECOMMENDED," "NOT RECOMMENDED," "MAY," and "OPTIONAL" in this document should be interpreted as described in [BCP 14](https://www.rfc-editor.org/info/bcp14) [RFC2119](https://datatracker.ietf.org/doc/html/rfc2119) [RFC8174](https://datatracker.ietf.org/doc/html/rfc8174) when, and only when, they appear in all capitals.

## OVERVIEW

LVT's Partner API provides customers with more ways to access LVT's intelligence and powers integrations with other industry-leading SOCs, such as Immix, Axon Fusus, Genetec Security Center, and more. LVT's Partner API also unlocks the ability for customers to build customizations and integrations with their own SOC for video and alert management to provide support for customized solutions.

LVT's Partner API allows SOC operators to monitor and access situations from a single dashboard. This includes two-way integration with control of all deterrence capabilities such as strobe lights, floodlights, prerecorded sounds, and live speaker talk-down.

Other features include video streaming, alert push notifications, and camera control, which includes pan/tilt/zoom, streaming, and general camera management.

Please email integrations@LVT.com for all API integration requests and questions.

### INTRODUCTION

LVT's Partner API is a REST service that uses JSON payloads and is defined in an OpenAPI YAML-format spec. LVT's Partner API can be consumed by an on-premises host or a cloud-provisioned client solution, so long as it has network access.

### KEY FEATURES

LVT's Partner API allows access to the variety of Live Unit configurations available to native company systems and allows access to:

- Check LVT Unit system information and control of lights, speakers, and talkdown.
- Interact with the unit.
- Control cameras and live streaming.
- Review and resolve alerts.

## GETTING STARTED

LVT's Partner API exposes a variety of functions and tools the LVT Unit has. With our API, partners can interact with integrations already available or create powerful new ways to help monitor and protect their business, property, and environment.

For the complete documentation on the API end-to-end, see the [full API Specification here](https://github.com/LiveViewTech/lvt-public-api/blob/master/api-specs/api.yaml).

### PREREQUISITES

- An account with LVT.
- Partnership agreement with LVT.

### QUICK START GUIDE

1. Sign up as an LVT customer.
2. Email integrations@lvt.com to request API access.
3. Work with your LVT contact to obtain your API key and client secret.

#### GET AN API KEY

Account admins of an LVT Unit can request access through their account representative directly.

> **Important:** An account admin has the ability to grant access to others, such as employees, guards, or law enforcement, as needed.

Once the business request has been received by LVT, an API key can be generated.

## ACCESS AND AUTHENTICATION

This section shows the authentication and access control mechanisms to integrate with LVT's Partner API, along with recommended security practices.

### AUTHENTICATION

Authentication with LVT's Partner API is based on the OAuth 2.0 standard.

- **Credential Gathering:** Short-lived JWT credentials must be obtained from LVT Partner API's designated credential endpoint.
- **Subsequent Operations:** This JWT credential is then used as a bearer token for all subsequent LVT Partner API operations.
- **Authentication Mechanism:** JWT authentication is handled via LVT authorization using an Client ID and Secret with the client_credentials OAuth flow.

#### ACCESS REQUEST METHOD

##### ROLE-BASED ACCESS CONTROL (RBAC)

- **Current State (as of Feb 19, 2025):** An API client has access to all units/locations defined in its client configuration at LVT.

#### AUTHENTICATE

LVT's Partner API uses OAuth 2.0 client credentials flow for authentication and authorization.

A client ID and secret provided by LVT will be needed to authenticate with LVT's Authorization Server to obtain an API access token.

1. Base64 encode your client ID and secret using a colon as a separator between them.

   ```bash
   echo -n CLIENT_ID:CLIENT_SECRET | base64
   ```

   The resulting value is the needed authentication token.

2. Using the authentication token make a call to LVT's authorization server to obtain an API access token.

   ```
   https://api.lvt.com/oauth2/v1/token
   ```

3. When making this call specify a comma separated list of scopes for the token to have. The scopes required to access different endpoints of the API are documented in the [API Specification](https://github.com/LiveViewTech/lvt-public-api/blob/master/api-specs/api.yaml).

   ```bash
   curl --request POST \
      --url https://api.lvt.com/oauth2/v1/token \
      --header 'accept: application/json' \
      --header 'authorization: Basic YOUR_TOKEN_HERE' \
      --data 'grant_type=client_credentials' \
      --header 'cache-control: no-cache' \
      --header 'content-type: application/x-www-form-urlencoded'
   ```

   The result will be a json object similar to this:

   ```json
   {
     "token_type": "Bearer",
     "expires_in": 3600,
     "access_token": "your_token_here",
     "scope": "..."
   }
   ```

   The value of the access_token key is the API access token.

4. To retrieve a listing of the LVT locations that your API account has access to:

   ```bash
   curl --request GET \
      --url https://api.lvt.com/v1/locations \
      --header 'accept: application/json' \
      --header 'authorization: Bearer YOUR_ACCESS_TOKEN_HERE'
   ```

#### SECURITY BEST PRACTICES

Developers should adhere to these security best practices when they when they use LVT's Partner API:

- **Credential Storage:** Practice good security hygiene around storing client secret credentials. Utilize secure storage solutions such as Vault, AWS Secrets Manager, or similar.
- **Credential Sharing:** Never share client credentials with unauthorized third parties (e.g., password managers, contractor companies).
- **Contractor Access:** For contractor development, request a separate set of client credentials directly from LVT. Do not share the client credentials provided to the primary client with a contractor.

## ENDPOINTS AND ERROR HANDLING

Each endpoint's documentation includes detailed examples of both successful requests and their corresponding responses, as well as various error responses. These examples are designed to facilitate developers' understanding of API interaction and effective error handling.

### ENDPOINTS

| METHOD | ENDPOINT | DESCRIPTION | PAYLOAD EXAMPLE |
|--------|----------|-------------|-----------------|
| GET | `/liveUnits` | This endpoint returns all the Live Units accessible by the specified client. | ```json<br>{<br>  "items": [<br>    {<br>      "id": "<uuid>",<br>      "clientId": "<uuid>",<br>      "gpsLocation": {<br>        "latitude": "<float>",<br>        "longitude": "<float>"<br>      },<br>      "locationId": "<uuid>",<br>      "name": "<string>"<br>    }<br>  ],<br>  "nextCursorUri": "<uri>",<br>  "totalResults": "<integer>",<br>  "itemsCount": "<integer>"<br>}<br>``` |
| GET | `/liveUnits/{liveUnitId}` | Details for the specified Live Unit. | ```json<br>{<br>  "id": "uuid",<br>  "gpsLocation": {<br>    "latitude": null,<br>    "longitude": null<br>  },<br>  "name": "",<br>  "clientId": "uuid",<br>  "locationId": "uuid"<br>}<br>``` |
| GET | `/liveUnits/{liveUnitId}/callInfo` | Information on how to make a call to the Live Unit. | ```json<br>{<br>  "phoneNumber": "str",<br>  "extension": "str",<br>  "passcode": "str"<br>}<br>``` |
| GET | `/liveUnits/{liveUnitId}/cameras` | List of user accessible cameras hosted by the given Live Unit. | ```json<br>{<br>  "items": [<br>    {<br>      "id": "",<br>      "liveUnitId": "",<br>      "manufacturer": null,<br>      "model": null,<br>      "name": "",<br>      "mountPosition": "",<br>      "role": "",<br>      "serialNumber": null,<br>      "thermal": false,<br>      "viewType": "",<br>      "capabilities": {<br>        "position": false<br>      }<br>    }<br>  ]<br>}<br>``` |
| GET | `/liveUnits/{liveUnitId}/sounds` | List of quick sounds that can be played by the Live Unit. | ```json<br>"items": [<br>  {<br>    "id": "",<br>    "name": ""<br>  }<br>]<br>``` |
| POST | `/liveUnits/{liveUnitId}:call` | Initiate a speaker talk-down call with the Live Unit. | ```json<br>{<br>  "callId": "",<br>  "wssUrl": ""<br>}<br>``` |
| POST | `/liveUnits/{liveUnitId}/sounds/{soundId}:play` | Play a quick sound from a Live Unit. | `204 No Content` |
| GET | `/liveUnits/{liveUnitId}/lights` | List of lights on the Live Unit. | ```json<br>{<br>  "items": [<br>    {<br>      "id": "",<br>      "name": "",<br>      "state": "",<br>      "type": ""<br>    }<br>  ]<br>}<br>``` |
| POST | `/liveUnits/{liveUnitId}/lights/{lightId}:toggle` | Toggle the status of a light on a Live Unit. | ```json<br>{<br>  "state": "",<br>  "resetTime": 60000<br>}<br>``` |
| GET | `/cameras/{cameraId}` | Details of selected camera. | ```json<br>{<br>  "id": "445550e0-6485-013c-5d2f-46744d1e8e0e",<br>  "liveUnitId": "",<br>  "manufacturer": null,<br>  "model": null,<br>  "name": "",<br>  "mountPosition": "",<br>  "role": "",<br>  "serialNumber": null,<br>  "thermal": false,<br>  "viewType": "",<br>  "capabilities": {<br>    "position": true<br>  }<br>}<br>``` |
| GET | `/cameras/{cameraId}/position` | Returns the selected camera's PTZF values. | ```json<br>{<br>  "focus": null,<br>  "pan": 331,<br>  "tilt": 160,<br>  "zoom": 4<br>}<br>``` |
| PUT | `UpdateCameraPosition` | This endpoint is deprecated. Use the PATCH request.** Updates a camera's PTZF. | ```json<br>{<br>  "pan": "<integer>",<br>  "tilt": "<integer>",<br>  "zoom": "<integer>",<br>  "focus": "<integer>"<br>}<br>``` |
| PATCH | `UpdateCameraPosition2` | Sets a camera's position relative to its current position, unless the absolute query parameter is passed. Some camera models do not support focus. If the focus is sent, it will be ignored. | `Accepted` |
| GET | `/cameras/{cameraId}/protocols` | Get list of protocols supported by this camera. | ```json<br>{<br>  "items": [<br>    {<br>      "protocol": "webrtc"<br>    },<br>    {<br>      "protocol": "rtsp"<br>    }<br>  ],<br>  "itemsCount": 2,<br>  "nextCursorUri": null,<br>  "totalResults": 2<br>}<br>``` |
| POST | `/cameras/{cameraId}/streams` | Starts a stream and returns stream data for the camera | ```json<br>{<br>  "protocol": "rtsp",<br>  "refreshInterval": 10000,<br>  "streamingUrl": "",<br>  "streamId": ""<br>}<br>``` |
| POST | `/streams/{streamId}:checkIn` | Check in streaming for the camera. | `204 No Content` |
| DELETE | `/streams/{streamId}` | Check in streaming for the camera. | `204 No Content` |
| GET | `/locations` | Returns all the locations accessible by the specified client. | ```json<br>{<br>  "items": [<br>    {<br>      "id": "<uuid>",<br>      "gpsLocation": {<br>        "latitude": "<float>",<br>        "longitude": "<float>"<br>      },<br>      "name": "<string>"<br>    }<br>  ]<br>}<br>``` |
| GET | `/locations/{locationId}` | Details for the specified location. | ```json<br>{<br>  "id": "<uuid>",<br>  "gpsLocation": {<br>    "latitude": "<float>",<br>    "longitude": "<float>"<br>  },<br>  "name": "<string>"<br>}<br>``` |
| GET | `/locations/{locationId}/liveUnits` | List of user-accessible Live Units at the given location. | ```json<br>{<br>  "items": [<br>    {<br>      "id": "<uuid>",<br>      "clientId": "<uuid>",<br>      "gpsLocation": {<br>        "latitude": "<float>",<br>        "longitude": "<float>"<br>      },<br>      "locationId": "<uuid>",<br>      "name": "<string>"<br>    }<br>  ]<br>}<br>``` |
| GET | `/alerts/events` | Get a list of events. By default, this returns all owned events but can be filtered using the query parameters. | See full JSON example in API spec |
| GET | `/alerts/events/{id}` | Get an event with the provided ID. | See full JSON example in API spec |
| POST | `/alerts/events/{id}:addNote` | Create a new note for the event with the provided ID. | ```json<br>{<br>  "id": "<uuid>"<br>}<br>``` |
| POST | `/alerts/events/{id}:resolve` | Resolve an event with the provided ID. | ```json<br>{<br>  "id": "<uuid>"<br>}<br>``` |
| POST | `/alerts/events/{id}:assignUser` | Assign a user to an event with the provided ID. | ```json<br>{<br>  "id": "<uuid>"<br>}<br>``` |
| GET | `/alerts/media/{mediaId}/url` | Get a signed URL for the provided ID. | ```json<br>{<br>  "url": "<uri>"<br>}<br>``` |
| POST | `/webhooks` | Create a webhook. Upon creation, a webhook is first verified by sending a test message. The message must be responded to with a 2xx response code to be considered successful. This success is prerequisite to the webhook creation. This process can be tested with the /webhooks:test endpoint before you create a webhook. | ```json<br>{<br>  "id": "<uuid>",<br>  "url": "<uri>",<br>  "namespace": "<string>",<br>  "enabled": "<boolean>",<br>  "created": "<dateTime>"<br>}<br>``` |
| GET | `/webhooks` | Get a list of webhooks. By default, this returns all owned webhooks but can be filtered using the query parameters. | ```json<br>{<br>  "items": [<br>    {<br>      "id": "<uuid>",<br>      "url": "<uri>",<br>      "namespace": "<string>",<br>      "enabled": "<boolean>",<br>      "created": "<dateTime>"<br>    }<br>  ],<br>  "nextCursorUri": "<uri>",<br>  "totalResults": "<integer>",<br>  "itemsCount": "<integer>"<br>}<br>``` |
| GET | `/webhooks/{webhookId}` | Get a webhook with the provided ID. | ```json<br>{<br>  "id": "<uuid>",<br>  "url": "<uri>",<br>  "namespace": "<string>",<br>  "enabled": "<boolean>",<br>  "created": "<dateTime>"<br>}<br>``` |
| DELETE | `/webhooks/{webhookId}` | Delete a webhook. | `204 No Content` |
| POST | `/webhooks:test` | Send a test message to a specified URL. This message contains the following payload with a signature in the "X-LVT-HMAC-SHA256" header so developers can test the validation process used in webhook creation. | ```json<br>{<br>  "attempt": 1,<br>  "currentAttemptTimestamp": "<CURRENT_DATE_AS_ISO_8601_STRING>",<br>  "action": "test",<br>  "data": {<br>    "message": "Hello, world!"<br>  }<br>}<br>``` |
| GET | `/publicKeys/{publicKeyId}` | Get a public key with the provided ID. | `<string>` |

## BEST PRACTICES

**Use temporary OAuth tokens to their full lifespan:** Always use the temporary credentials generated from the `oauth2/v1/token` endpoint to their full lifespan (which is 60mins at time of writing), and avoid unnecessarily requesting tokens when there is one that is still valid. If we detect that tokens are being generated at an unnecessarily high rate, LVT's system may rate limit or temporarily disable the related API key to protect resource utilization.

**Use webhooks for alert data rather than the `/alerts/` endpoints:** While LVT offers the ability to pull alert data, webhook subscription allows for real-time push notification of alert data, which consumes less resources. Webhook delivery also provides updates to alerts when statuses and new events come in, which is not available via the pull-based alert endpoints.

**Optimize for streaming:** Pad extra time for latency when using the `checkIn` endpoint to keep a video stream active. Our stated heartbeat is to call `checkIn` on an every-10-seconds interval. If there are stream disconnections, try reducing to 9 or 8 seconds, and be mindful of the latency between the application and LVT services.

## WEBHOOKS

See this article for the complete webhook documentation.

## ERRORS

All error responses will be returned with an appropriate HTTP status code. The structure of the response body will vary based on the HTTP status code.

### 400-Level Errors

For 400-level errors (e.g., 400 Bad Request), the API response will omit any payload specifics.

```json
{
  "errorCode": 12,
  "errorCauses": [
    "Body is missing the following field: state"
  ],
  "errorSummary": "Validation error",
  "errorId": "d6612277f269593fd5c188506f17f4fb"
}
```

### 500-Level Errors

For 500-level errors (e.g., 500 Internal Server Error), the API response will include a message string that describes the error along with the status code.

```json
{
  "message": "Live unit service unavailable",
  "statusCode": 503
}
```

## COMMON ERRORS AND HANDLING

Developers should expect and be prepared to handle these common error scenarios:

| HTTP Status Code | Description | Developer Handling Recommendation |
|------------------|-------------|-----------------------------------|
| 400 Bad Request | Malformed inputs. | Treat as invalid or malformed input data. Do not impose validation rules more strict than those described in the API specification. |
| 401 Unauthorized | Invalid credentials. | Make sure valid authentication credentials are provided. |
| 403 Forbidden | User does not have access to the requested operation. | Make sure the user has permissions for the requested resource or operation. |
| 405 Method Not Allowed | Incorrect HTTP method (e.g., GET for POST). | Make sure the correct HTTP method is used for the intended API endpoint. |
| 429 Too Many Requests | Calling service is making requests too quickly. | Implement a backoff strategy to reduce the rate of API calls. There is a rate limit of 40 TPS. For larger use cases, contact LVT for assistance. |
| 500 Internal Server Error | Error without an automatic solution. | Contact LVT for assistance. Provide relevant request details, if possible. |
| 503 Service Unavailable | LVT availability issue. | Contact LVT Support for resolution on the abnormal behavior. |

## ERROR LOGGING

API interactions are subject to automatic tracing provided by OpenTelemetry instrumentation. This applies to most of LVT's applications and services, including the Partner API. As problem areas are encountered by the engineering group, additional layers of logging and instrumentation are built into the application as needed.

### ERROR HANDLING

The API incorporates predefined error-handling mechanisms for various failure scenarios:

- **Gateway Handling:** The API gateway provides initial handling for common issues, such as rate limiting, distributed denial of service (DDoS) attacks, and authentication failures.
- The Partner API utilizes standard error handling mechanisms consistent with other LVT applications, including the alerts-service, mediator, and other services within the federated graph. This ensures a consistent approach to error reporting and resolution across the ecosystem.

## RATE LIMITING

Developers integrating with LVT's Partner API should be aware of the following policies regarding rate limits, throttling, and general API constraints:

- **Individual Client Rate Limit:** Each API client is subject to a maximum rate limit of 40 transactions per second (TPS).
- **Global Integration Throttling:** When integrating multiple systems, a global maximum of 20 transactions per second (TPS) is enforced per API client as of February 19, 2025. Due to the varying usage volumes across clients and integration types, rate limiting will be applied on a sliding scale. This configuration will be tailored per-client based on the specific nature of their integration.

### REQUEST HANDLING

- **Bulk Requests:** LVT's Partner API design supports only singular, unit-based actions. While these operations can be invoked in parallel, clients must ensure that such an approach does not exceed their allocated rate limits.
- **High-Traffic Situations and Scaling Best Practices:** As each new type of integration will present unique scaling requirements, specific best practices for scaling integrations will be developed and communicated on a case-by-case basis.

## VERSION AND SUPPORT

### VERSION

LVT's Partner API adheres to a *major* versioning scheme. The *major* version SHALL designate significant changes to LVT's Partner API feature set, potentially including backward-incompatible changes. The current *major* version of the API is V1, released in October 2024. Future major versions will be communicated through LVT Partner contacts and will include details on backward compatibility and migration paths.

### SUPPORT

For support, troubleshooting, and general inquiries about LVT's Partner API, contact LVT:

- **Phone:** 888-588-9408
- **Email:** integrations@lvt.com

For specific technical support needs, please include the API version you are using and any relevant error messages or request/response details.
