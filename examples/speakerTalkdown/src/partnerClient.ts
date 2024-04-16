import 'dotenv/config';
import axios, {AxiosError} from 'axios';
import fs from 'fs';
import ws from 'ws';

const PTD_URL = process.env.PTD_URL ?? '';
const SECURITY_EVENT_ID = process.env.SECURITY_EVENT_ID ?? '';
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? '';
const AUDIO_FILE = process.env.AUDIO_FILE ?? './veryquiet.ulaw';

/**
 * This is a test partner client that requests a call by making a POST to the
 * Partner Talkdown service's HTTP endpoint and then sends canned audio from
 * a Mulaw file to the Partner Talkdown's WebSocket server.
 */
class TestPartnerClient {
  private wssUrl = '';

  constructor() {}

  public async sendAudioData(): Promise<void> {
    this.wssUrl = await this.startCall();
    if (this.wssUrl.match(/ngrok.io/)) {
      this.wssUrl = this.wssUrl.replace(/^.*\/ws/, 'wss://localhost:4000/ws');
    }
    console.log(`partner wssUrl = ${this.wssUrl}`);

    let socket: ws.WebSocket | null = null;
    try {
      const audio = await this.getAudioData();
      socket = await this.connectToWebSocketServer(this.wssUrl);

      // send connect message
      sendWSMsg(socket, {
        event: 'partner-connect',
        clientId: 22,
        callSid: this.wssUrl,
      });

      // 8000 * (ms / 1000) = bytes -> bytes = ms * 8
      const ms = 100;
      const chunkSize = ms * 8;
      let stop = false;
      for (let i = 0; i < audio.byteLength && !stop; i += chunkSize) {
        await sleepMs(ms);
        const len = Math.min(chunkSize, audio.byteLength - i);
        // console.log(`sending audio bytes ${i} to ${i + len}`);
        socket.send(audio.subarray(i, i + len), (err?) => {
          if (err) {
            console.error(`failure sending audio: ${err}`);
            stop = true;
          }
        });
      }
    } finally {
      if (socket) {
        socket.close();
      }
    }
  }

  private async startCall(): Promise<string> {
    const postData: any = {
      securityEventId: SECURITY_EVENT_ID,
    };
    console.log(`POST ${PTD_URL}: ${JSON.stringify(postData)}`);
    const rsp = await axios.post(PTD_URL, postData, {
      headers: {Authorization: `Bearer ${AUTH_TOKEN}`},
    });
    const wssUrl: string = rsp.data.wssUrl;
    return wssUrl;
  }

  private getAudioData(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(AUDIO_FILE, null, (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(data);
      });
    });
  }

  private connectToWebSocketServer(wssUrl: string): Promise<ws.WebSocket> {
    return new Promise(resolve => {
      const socket = new ws.WebSocket(wssUrl, {
        headers: {Authorization: `Bearer ${AUTH_TOKEN}`},
        rejectUnauthorized: false,
      });

      socket.on('message', rawMsg => {
        console.warn(`unexpected msg from WS server: ${rawMsg}`);
      });

      socket.on('error', console.error);

      socket.on('open', () => {
        resolve(socket);
      });
    });
  }
}

function onError(err: Error | undefined) {
  if (err) {
    console.error(`error: ${err}`);
  }
}

function sendWSMsg(socket: ws.WebSocket, msg: any) {
  console.log(`sending msg ${JSON.stringify(msg)}`);
  socket.send(JSON.stringify(msg), onError);
}

function sleepMs(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// main
async function main() {
  try {
    const client = new TestPartnerClient();
    await client.sendAudioData();
  } catch (err: any) {
      if (err instanceof AxiosError) {
      console.error(`${err.toString()}: ${err.response?.data.errorCauses}`);
    } else {
      console.error(err.toString());
    }
  }
}

main();
