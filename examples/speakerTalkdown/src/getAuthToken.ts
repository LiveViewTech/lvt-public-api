import axios from 'axios';
import {parse} from 'ts-command-line-args';

interface GetAuthArgs {
  clientId?: string;
  secret?: string;
  help?: boolean;
}

async function main() {
  const args = parse<GetAuthArgs>(
    {
      clientId: {type: String, alias: 'c', optional: true},
      secret: {type: String, alias: 's', optional: true},
      help: {type: Boolean, alias: 'h', optional: true},
    },
    {helpArg: 'help'}
  );
  const authUrl = 'https://api.lvt.com/oauth2/v1/token';
  if (!args.clientId || !args.secret) {
    console.log(`Must supply clientId (-c) and secret (-s) for ${authUrl}`);
    return;
  }
  const authCreds = `${args.clientId}:${args.secret}`;
  const encoded = btoa(authCreds);
  const postParams = new URLSearchParams();
  postParams.append('grant_type', 'client_credentials');
  try {
    const rsp = await axios.post(
      authUrl,
      postParams,
      {
        headers: {
          Authorization: `Basic ${encoded}`,
          'Content-Length': postParams.toString().length,
        },
      }
    );
    console.log(`AUTH_TOKEN="${rsp.data.access_token}"`);
  } catch (err: any) {
    console.error(`failure: ${err}`);
  }
}

main();
