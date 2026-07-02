import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z.string().describe('Moz API token from https://moz.com/api/dashboard')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Auth (Legacy)',
    key: 'basic_auth',
    inputSchema: z.object({
      accessId: z.string().describe('Moz Access ID'),
      secretKey: z.string().describe('Moz Secret Key')
    }),
    getOutput: async ctx => {
      let encoded = Buffer.from(`${ctx.input.accessId}:${ctx.input.secretKey}`).toString(
        'base64'
      );
      return {
        output: {
          token: `Basic ${encoded}`
        }
      };
    }
  });
