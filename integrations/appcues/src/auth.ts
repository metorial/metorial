import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Base64-encoded API key:secret for Basic Auth')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Secret',
    key: 'api_key_secret',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Appcues API Key. Create one at https://studio.appcues.com/settings/keys'
        ),
      apiSecret: z
        .string()
        .describe('Your Appcues API Secret. Only shown once at creation time')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.apiKey}:${ctx.input.apiSecret}`);
      return {
        output: {
          token: encoded
        }
      };
    }
  });
