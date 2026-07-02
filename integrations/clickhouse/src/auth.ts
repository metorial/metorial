import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe('Base64-encoded API key credentials (keyId:keySecret) for HTTP Basic Auth')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      keyId: z
        .string()
        .min(1)
        .describe('The API Key ID (used as the username for HTTP Basic Auth)'),
      keySecret: z
        .string()
        .min(1)
        .describe('The API Key Secret (used as the password for HTTP Basic Auth)')
    }),

    getOutput: async ctx => {
      let credentials = Buffer.from(`${ctx.input.keyId}:${ctx.input.keySecret}`).toString(
        'base64'
      );
      return {
        output: {
          token: credentials
        }
      };
    }
  });
