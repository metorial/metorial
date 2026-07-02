import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      secret: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key & Secret',
    key: 'api_key_secret',

    inputSchema: z.object({
      apiKey: z.string().describe('Your Engage API key (found in Settings)'),
      apiSecret: z.string().describe('Your Engage API secret (found in Settings)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          secret: ctx.input.apiSecret
        }
      };
    }
  });
