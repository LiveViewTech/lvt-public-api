# WebRTC example

## Steps to stream an LVT camera through WebRTC
What needs to take place to initiate the stream and negotiate the WebRTC connection through the camera relay.

- [start the stream](#start-the-stream)
- [initiate WebSocket and peer connection](#initiate-websocket-and-peer-connection)
- [request offer from the camera relay](#request-offer-from-the-camera-relay)
- [accept offer from the camera relay](#accept-offer-from-the-camera-relay)
- [handle track event](#handle-track-event)
- [combined example](#combined-example)
- [firewall](#firewall)
### start the stream
First a `POST /cameras/{cameraId}/streams` command must be sent to initialize the stream.

| Response fields   |                                                                              |
| ----------------- | ---------------------------------------------------------------------------- |
| `streamId`        | Used to checkIn and checkOut of the stream                                   |
| `refreshInterval` | Millisecond interval the stream checkIn should be called                     |
| `signalUrl`       | URL to the camera relay signal server which negotiates the WebRTC connection |
| `streamInfo`      | Case-sensitive data passed to the camera relay                               |

The stream checkIn `POST /streams/{streamId}:checkIn` must be called at an interval to keep the stream alive.

The stream checkOut `DELETE /streams/{streamId}` should be called when you are finished.

```ts
const API_TOKEN = '<token>';
const cameraId = '<cameraId>';
const axiosClient = axios.create({
    headers: {
        'Authorization': `Bearer ${API_TOKEN}` 
    },
});

// start stream
axiosClient.post(`https://api.lvt.com/v1/cameras/${cameraId}/streams`, { protocol: 'webrtc')
    .then((res) => {
        const { streamId, signalUrl, streamInfo, refreshInterval } = res.data;

        // keep stream alive
        setInterval(() => {
            axiosClient.post(`https://api.lvt.com/v1/streams/${streamId}:checkIn`);
        }, refreshInterval);

        // end stream
        window.addEventListener('beforeunload', () => {
            axiosClient.delete(`https://api.lvt.com/v1/streams/${streamId}`);
        });
    });
```

### initiate WebSocket and peer connection
Establish a WebSocket connection with the camera relay, a signal server, which will pass negotiation information between your local client and the stream.

```ts
const ws = new WebSocket(signalUrl)
const peerConnection = new RTCPeerConnection();
```

### request offer from the camera relay
The `POST /camera/{cameraId}/streams` response will return the needed information to initiate WebRTC through the camera relay.  The `streamInfo` is an object that will need to be passed to the camera relay.

> **NOTE:** The properties of `streamInfo` (`applicationName`, `streamName`, and `sessionId`) are case sensitive, so you need to ensure the casing is not transformed when you decode or encode the object.

```ts
const getOffer = () => {
    const message = {
        direction: 'play',
        command: 'getOffer',
        streamInfo,
    };

    ws.send(JSON.stringify(message));
}

ws.addEventListener('open', () => {
    getOffer();
});
```

---

Sometimes, it can take a couple seconds to establish a stream with the camera,
so the camera relay will reply it's not ready, and the request will need to be resent.

```ts
ws.addEventListener('message', (messageEvent) => {
    const data = JSON.parse(messageEvent.data);
    const status = Number(data.status);

    if (status == 502 || status == 504) {
        setTimeout(getOffer, 1000);
    }
});
```

| code |                                                                                                                                                |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 502  | the camera relay is in the process of connecting to the camera                                                                                 |
| 504  | the camera relay is not attempting to connect to the camera. This is an expected response for a couple seconds after the start stream request. |
| 200  | success                                                                                                                                        |
|      |                                                                                                                                                |

### accept offer from the camera relay
Once the camera relay is ready it will send an offer back through the WebSocket with a status of 200. Steps to handle the offer include:

#### 1. add sessionId
The camera relay sends a session id `data.streamInfo.sessionId`, which
needs to be added to the `streamInfo` from the `POST /camera/{cameraId}/streams` response.

```ts

ws.addEventListener('message', (message) => {
    const data = JSON.parse(message.data);
    const status = Number(data.status);

    if (status == 200) {
        // step 1
        if (data.streamInfo && data.streamInfo.sessionId) {
            streamInfo.sessionId = data.streamInfo.sessionId;
        }
    }
});
```

#### 2. set remote SDP send local SDP to camera relay 
The camera relay sets the SDP from the remote server `data.sdp` on the `RTCPeerConnection`.
A local SDP is created and sent to the camera relay. 

```ts
// step 2
if (data.sdp) {
    peerConnection
        .setRemoteDescription(new RTCSessionDescription(data.sdp)) 
        .then(() => peerConnection.createAnswer())
        .then((description) => peerConnection.setLocalDescription(description))
        .then(() => {
            const message = {
                direction: 'play',
                command: 'sendResponse',
                sdp: peerConnection.localDescription,
                streamInfo,
            };

            ws.send(JSON.stringify(message));
        });
}
```

#### 3. add proposed ice candidates
The camera relay sends proposed ice candidates which need to be added to the `RTCPeerConnection`.
The server will send both TCP and UDP ice candidates. You will have better performance if you ensure the UDP protocol is used; TCP re-transmissions can cause significant delays.

```ts
// step 3 add ice candidates
if (data.iceCandidates) {
    for (const ic of data.iceCandidates) {
        if (ic.candidate.indexOf(' UDP ') > 0) {
            peerConnection.addIceCandidate(new RTCIceCandidate(ic));
        }
    }
}
```


### handle track event
When a new track is ready, the track event will be sent.

```ts
peerConnection.addEventListener('track', (event) => {
    const [ stream ] = event.streams;

    const videoEm = document.getElementById('webrtc-video');
    videoEm.srcObject = stream;
});
```

> **NOTE:** Autoplaying a video may be blocked unless you have muted the video.
https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide#autoplay_availability

### combined example
```ts
const establishConnectionToStream = (signalUrl, streamInfo) => {
    const ws = new WebSocket(signalUrl)
    const peerConnection = new RTCPeerConnection();

    const getOffer = () => {
        const message = {
            direction: 'play',
            command: 'getOffer',
            streamInfo,
        };

        ws.send(JSON.stringify(message));
    }

    ws.addEventListener('open', () => {
        // request offer
        getOffer();
    });

    ws.addEventListener('message', (message) => {
        const data = JSON.parse(message.data);
        const status = Number(data.status);

        // retry, stream is not ready.
        if (status == 502 || status == 504) {
            setTimeout(getOffer, 1000);
        }

        if (status == 200) {
            // step 1: add session id
            if (data.streamInfo && data.streamInfo.sessionId) {
                streamInfo.sessionId = data.streamInfo.sessionId;
            }

            //step 2: set remote SDP and send local SDP to the camera relay
            if (data.sdp) {
                peerConnection
                    .setRemoteDescription(new RTCSessionDescription(data.sdp)) // step 2
                    .then(() => peerConnection.createAnswer())
                    .then((description) => peerConnection.setLocalDescription(description))
                    .then(() => {
                        const message = {
                            direction: 'play',
                            command: 'sendResponse',
                            sdp: peerConnection.localDescription,
                            streamInfo,
                        };

                        ws.send(JSON.stringify(message));
                    });
            }

            // step 3 add ice candidates
            if (data.iceCandidates) {
                for (const ic of data.iceCandidates) {
                    if (ic.candidate.indexOf(' UDP ') > 0) {
                        peerConnection.addIceCandidate(new RTCIceCandidate(ic));
                    }
                }
            }
        }
    });

    peerConnection.addEventListener('track', (event) => {
        const [ stream ] = event.streams;

        const videoEm = document.getElementById('webrtc-video');
        videoEm.srcObject = stream;
    });
}

const API_TOKEN = '<token>';
const cameraId = '<cameraId>';
const axiosClient = axios.create({
    headers: {
        'Authorization': `Bearer ${API_TOKEN}` 
    },
});

// start stream
axiosClient.post(`https://api.lvt.com/v1/cameras/${cameraId}/streams`, { protocol: 'webrtc' })
    .then((res) => {
        const { streamId, signalUrl, streamInfo, refreshInterval } = res.data;

        // keep stream alive
        setInterval(() => {
            axiosClient.post(`https://api.lvt.com/v1/streams/${streamId}:checkIn`);
        }, refreshInterval);

        // end stream
        window.addEventListener('beforeunload', () => {
            axiosClient.delete(`https://api.lvt.com/v1/streams/${streamId}`);
        });
    });
```

### firewall
Your network firewall will need to allow communication as indicated: https://support.liveviewtech.com/article/44-configuring-firewall-whitelisting

## Additional information
More details on establishing WebRTC connections:
https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling


# Disclaimer
We are providing this sample code for illustrative purposes only to showcase the potential 
functionality of our WebRTC streaming. It is not intended to represent a complete or production-
ready solution. By using the code, you agree to the terms of this disclaimer. The code is a beta 
version and is provided on an "as-is" and "as-available" basis. It may be incomplete, unstable, 
and may contain bugs or errors. This version may not represent the final release. The code is 
provided without any warranty, express or implied, and we disclaim all warranties, including but 
not limited to the implied warranties of merchantability and fitness for a particular purpose. We 
reserve the right to modify or discontinue the code at any time. You are encouraged to provide 
feedback on the code, including any issues, errors, or suggestions for improvement. We may 
use your feedback to enhance the code. The code may result in data loss, security 
vulnerabilities, or other adverse effects. It is recommended not to use the code with sensitive or 
critical data. We are not liable for any direct, indirect, special, incidental, or consequential 
damages arising out of or in connection with the use of the beta code.