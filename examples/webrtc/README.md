# Webrtc example

## Steps to stream an LVT camera through webrtc
What needs to take place to initiate the stream and negotiate the webrtc connection through the signal server.

1. [start the stream](#start-the-stream)
2. [request offer from signal server](#request-offer-from-signal-server)
3. [accept offer from signal server](#accept-offer-from-signal-server)
4. [handle track event](#handle-track-event)
### start the stream
First a `POST /cameras/{cameraId}/streams` command must be sent to initialize the stream.

Then an interval needs to be set to call `POST /streams/{streamId}/checkin` to checkin to keep the stream running.

```ts
const API_TOKEN = '';
const cameraId = '0a755da9-e10b-4753-8293-cc2c60e11364';
const axiosClient = axios.create({
    headers: {
        'Authorization': `Bearer ${API_TOKEN}` 
    },
});

axiosClient.post(`https://api.lvt.com/v1/cameras/${cameraId}/streams`, { protocol: 'webrtc' })
    .then((res) => 
        const { streamId, signalUrl, streamInfo, refreshInterval } = res.data;

        setInterval(() => {
            axiosClient.post(`https://api.lvt.com/v1/streams/${streamId}:checkIn`);
        }, refreshInterval);
    )
```

### request offer from signal server
The `POST /camera/{cameraId}/streams` response will return the needed information to initiate webrtc through a signal server. The `signalUrl` is a uri for a websocket connection. The `streamInfo` is an object that will need to be passed to the signal server.

```ts
const ws = new WebSocket(signalUrl)

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

Sometimes, it can take a couple seconds to establish a stream with the camera,
so the signal server will reply it's not ready, the request will need to be resent.

```ts
ws.addEventListener('message', (messageEvent) => {
    const data = JSON.parse(messageEvent.data);
    const status = Number(data.status);

    if (status == 502 || status == 504) {
        setTimeout(getOffer, 1000);
    }
})
```

### accept offer from signal server
Once the signal server is ready it will send an offer back through the websocket with a status of 200.

Handling the offer includes:

1.  adding a `sessionId` to the `streamInfo`
2.  adding the `sdp` (Session Description Protocol) to the `RTCPeerConnection`
3.  sending a reply to the signal server
4.  adding any `iceCandidates` to the `RTCPeerConnection`

#### 1. add sessionId
The signal server sends a session id `data.streamInfo.sessionId`, which
needs to be added to the `streamInfo` from the `POST /camera/{cameraId}/streams` response.

```ts
const peerConnection = new RTCPeerConnection();

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

#### 2. add sdp as remote description
The signal server sends the sdp of the remote server `data.sdp`, which needs to be added to the `RTCPeerConnection`

```ts
// step 2 
if (data.sdp) {
    peerConnection
        .setRemoteDescription(new RTCSessionDescription(data.sdp)); // step 2
}
```

#### 3. send local sdp to signal server
A local sdp needs to be created and sent to the signal server.

```ts
// step 2 and 3
if (data.sdp) {
    peerConnection
        .setRemoteDescription(new RTCSessionDescription(data.sdp)) // step 2
        // step 3
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

#### 4. add proposed ice candiates
The signal server sends proposed ice candidates which need to be added to the `RTCPeerConnection`.

```ts
// step 4
if (data.iceCandidates) {
    for (const ic of data.iceCandidates) {
        peerConnection.addIceCandidate(new RTCIceCandidate(ic));
    }
}
```

#### All together
```ts
ws.addEventListener('message', (message) => {
    const data = JSON.parse(message.data);
    const status = Number(data.status);

    if (status == 200) {
        // step 1
        if (data.streamInfo && data.streamInfo.sessionId) {
            streamInfo.sessionId = data.streamInfo.sessionId;
        }

        //step 2 and 3
        if (data.sdp) {
            peerConnection
                .setRemoteDescription(new RTCSessionDescription(data.sdp)) // step 2
                // step 3
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

        // step 4
        if (data.iceCandidates) {
            for (const ic of data.iceCandidates) {
                peerConnection.addIceCandidate(new RTCIceCandidate(ic));
            }
        }
    }
});
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

Note that autoplaying a video may be blocked unless you have muted the video.
https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide#autoplay_availability

### more information
More details on establishing webrtc connections:
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