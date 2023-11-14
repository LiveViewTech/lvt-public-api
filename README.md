# LVT Public REST API User Guide

# Description

LiveView Technologies is a full service provider of remote (off-grid) camera and data acquisition systems and solutions. As a full service provider, LiveView makes it easy for both
public and private entities to stream live video aggregated with sensor data from anywhere on the planet using cellular, satellite, wireless, or WAN/MAN/LAN networks. LiveView's
patent-pending LIVE Engine brings to the industry the only solution that can actively manage data consumption ultimately saving customers thousands of dollars in annual metered
data charges. LiveView provides a complete range of services and solutions from beginning to end including system design & engineering, fabrication, installation, regular
maintenance, service & repair, software & electronic engineering, and web enabled interfaces & mobile apps. LiveView makes it easy to plan for and budget the costs associated with
remote live video streaming and data acquisition by providing a simple one-time installation fee and an ongoing per month service charge that covers everything needed to keep the
system running 24/7; there are no hidden costs.

LiveView Technologies turns your video and data into Intelligence that enables you to make informed decisions.

# Quick Start

API endpoints are documented in detail in the [API Specification](./api-specs/api.yaml)

## Authenticating

The LVT Public REST API uses Oauth2 client credentials flow for authentication and authorization.

Using the client ID and secret provided by LVT you may authenticate with LVT's Okta instance to obtain an API access token.

1. Base64 encode your client ID and secret using a colon as a separator between them.

`echo -n CLIENT_ID:CLIENT_SECRET | base64`

The resulting value is your authentication token.

2. Using your authentication token make a call to LVT's Okta authorization server to obtain an API access token.

* https://api.lvt.com/oauth2/v1/token

When making this call you must specify a comma separated list of scopes you want your token to have. The scopes required
to access different endpoints of the API are documented in the [API Specification](./api-specs/api.yaml).

```shell
  curl --request POST \
   --url URL=https://api.lvt.com/oauth2/v1/token \
   --header 'accept: application/json' \
   --header 'authorization: Basic YOUR_TOKEN_HERE' \
   --data 'grant_type=client_credentials' \
   --header 'cache-control: no-cache' \
   --header 'content-type: application/x-www-form-urlencoded'
```

The result will be a json object similar to this

```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "your_token_here",
  "scope": "..."
}
```

The value of the `access_token` key is your API access token.

3. Make calls the LVT REST API using your access token.

```shell
  curl --request GET \
   --url https://api.lvt.com/v1/locations \
   --header 'accept: application/json' \
   __header 'authorization: Bearer YOUR_ACCESS_TOKEN_HERE'
```

Additional details can be found in [Okta's
documentation](https://developer.okta.com/docs/guides/implement-grant-type/clientcreds/main/)

## Streaming

&#42; Available protocols for the camera can be found by the `GET /cameras/{cameraId}/protocols` endpoint.

### Streaming rtsp
#### Starting a stream

To start a stream, make the following request:

```shell
curl --request POST \
 --url https://api.lvt.com/v1/cameras/CAMERA_ID/streams \
 --header 'accept: application/json' \
 --header 'authorization: Bearer YOUR_ACCESS_TOKEN_HERE'
 --data '{ "protocol": "rtsp" }'
```
This request will start a stream internally and respond with a `200` status code and a body that looks something like this:

```json
{
  "refreshInterval": 10000,
  "streamingUrl": "rtsp://streaming.url.com/rtplive/1234.stream",
  "streamId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

The `streamingUrl` can then be provided to a player to start a stream. **The stream will automatically timeout after a certain period of time.** This can be prevented by checking
in to the stream using the `streamId` provided in the response.

#### Refreshing a stream

The `refreshInterval` returned from a successful start stream response is the recommended interval in milliseconds for users to check into the stream. A check in request for the
above example would be as follows:

```shell
curl --request POST \
 --url https://api.lvt.com/v1/streams/STREAM_ID:checkIn \
 --header 'authorization: Bearer YOUR_ACCESS_TOKEN_HERE'
```

Note that the colon is used as a url delimiter and the exact string `:checkIn` needs to appear at the end of the request url.

A successful check in will respond with a `204` status code and no body. This means that the stream duration has been extended.

&#42; The actual timeout duration is longer than the recommended refresh interval so one or two missed check ins will not immediately drop the stream.

#### Ending a stream

This API provides a `DELETE /streams/STREAM_ID` to check out of a stream, thus indicating that the API user is no longer viewing the stream. This behavior is not much different
from
just allowing the stream to time out. It is recommended to explicitly check out of streams to avoid unexpected behavior.

An example request is as follows:

```shell
curl --request DELETE \
 --url https://api.lvt.com/v1/streams/STREAM_ID \
 --header 'authorization: Bearer YOUR_ACCESS_TOKEN_HERE'
```

When successful this will return a `204` status code with no body. All subsequent requests to check in or delete the same stream ID will result in a `404` (This is the same
behavior as letting a stream time out).

### Streaming webrtc
[streaming with webrtc](./examples/webrtc/README.md)

## Alerts

### Media
Media associated with an alert will either be a mp4 video clip or a jpg image. The url associated with alert media is signed when the request is issued and expires after 2 
hours. If the request is made again, a new signed url will be generated.

# API Rate Limits and Quotas

The API request rate is limited to 20 requests per second. Exceeding this limit may result in degredation of performance
or temporary suspension of service.

The total number of requests cannot exceed 100,000 per day. 

# Disclaimer

LiveView Technologies makes no representations or warranties with respect to this publication and specifically disclaims any expressed or implied warranties of merchantability or
fitness for any particular purpose. LiveView Technologies reserves the right to make changes to any and all parts of this publication at any time without any obligation to notify
any person or entity of such changes.

# Trademarks

LiveView Technologies and its respective logos are trademarks or registered trademarks of LiveView Technologies. Other product and company names mentioned in this document may be
the trademarks or registered trademarks of their respective owners.

# Copyright

Copyright © 2023 LiveView Technologies. All rights reserved. No part of this publication may be reproduced, photocopied, stored on a retrieval system or transmitted without the
express written consent of the publisher.

# Contact Us

LVT
802 E 1050 S
American Fork, UT 84003 USA
https://www.lvt.com 
