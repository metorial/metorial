import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Base64-encoded Basic auth credentials (client_id:api_key)')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',

    inputSchema: z.object({
      clientId: z.string().describe('Your MX client_id from the Client Dashboard'),
      apiKey: z.string().describe('Your MX api_key from the Client Dashboard')
    }),

    getOutput: async ctx => {
      let encoded = Buffer.from(`${ctx.input.clientId}:${ctx.input.apiKey}`).toString(
        'base64'
      );
      return {
        output: {
          token: encoded
        }
      };
    }
  });
