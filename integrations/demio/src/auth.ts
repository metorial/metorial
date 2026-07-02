import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiSecret: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Secret',
    key: 'api_key_secret',
    inputSchema: z.object({
      apiKey: z.string().describe('Demio API Key (found in Account Settings > API)'),
      apiSecret: z.string().describe('Demio API Secret (found in Account Settings > API)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          apiSecret: ctx.input.apiSecret
        }
      };
    }
  });
