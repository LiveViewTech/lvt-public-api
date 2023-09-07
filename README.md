# LVT Public REST API User Guide

# Description

LiveView Technologies is a full service provider of remote (off-grid) camera and data acquisition systems and solutions. As a full service provider, LiveView makes it easy for both public and private entities to stream live video aggregated with sensor data from anywhere on the planet using cellular, satellite, wireless, or WAN/MAN/LAN networks. LiveView's patent-pending LIVE Engine brings to the industry the only solution that can actively manage data consumption ultimately saving customers thousands of dollars in annual metered data charges. LiveView provides a complete range of services and solutions from beginning to end including system design & engineering, fabrication, installation, regular maintenance, service & repair, software & electronic engineering, and web enabled interfaces & mobile apps. LiveView makes it easy to plan for and budget the costs associated with remote live video streaming and data acquisition by providing a simple one-time installation fee and an ongoing per month service charge that covers everything needed to keep the system running 24/7; there are no hidden costs. 

LiveView Technologies turns your video and data into Intelligence that enables you to make informed decisions.

# Quick Start

API endpoints are documented in detail in the [API Specification](./api-spects/api.yaml)

## Authenticating

The LVT Public REST API uses Oauth2 client credentials flow for authentication and authorization. 

Using the client ID and secret provided by LVT you may authenticate with LVT's Okta instance to obtain an API access token.

1. Base64 encode your client ID and secret using a colon as a separator between them.

`echo -n clientid:secret | base64`

The resulting value is your authentication token.

2. Using your authentication token make a call to LVT's Okta authorization server to obtain an API access token.

* https://lvt-auth.okta.com/aus76o7ru4ivvwtYR697/v1/token

When making this call you must specify a comma separated list of scopes you want your token to have. The scopes required
to access different endpoints of the API are documented in the [API Specification](./api-spects/api.yaml).

For full API access request the following scopes: basic.liveUnits.manage, basic.locations.manage, basic.cameras.manage

```
  curl --request POST \
   --url URL=https://lvt-auth.okta.com/aus76o7ru4ivvwtYR697/v1/token \
   --header 'accept: application/json' \
   --header "authorization: Basic $token" \
   --data "grant_type=client_credentials&scope=basic.liveUnits.manage,basic.locations.manage,basic.cameras.manage" \
   --header 'cache-control: no-cache' \
   --header 'content-type: application/x-www-form-urlencoded' \
```

The result will be a json object similar to this

```
{"token_type":"Bearer","expires_in":3600,"access_token":"your-token-here","scope":"..."}
```

The value of the access_token key is your API access token.

3. Make calls the LVT REST API using your access token.

```
  curl --request GET \
   --url https://api.lvt.com/v1/locations \
   --header 'accept: application/json' \
   --header "authorization: Bearer YOUR-ACCESS-TOKEN-HERE" \
```

Additional details can be found in [Okta's
documentation](https://developer.okta.com/docs/guides/implement-grant-type/clientcreds/main/)

# Disclaimer 
LiveView Technologies makes no representations or warranties with respect to this publication and specifically disclaims any expressed or implied warranties of merchantability or fitness for any particular purpose. LiveView Technologies reserves the right to make changes to any and all parts of this publication at any time without any obligation to notify any person or entity of such changes.

# Trademarks 
LiveView Technologies and its respective logos are trademarks or registered trademarks of LiveView Technologies. Other product and company names mentioned in this document may be the trademarks or registered trademarks of their respective owners.

# Copyright 
Copyright © 2023 LiveView Technologies. All rights reserved. No part of this publication may be reproduced, photocopied, stored on a retrieval system or transmitted without the express written consent of the publisher.

# Contact Us 
LVT
802 E 1050 S
American Fork, UT 84003 USA
https://www.lvt.com 
