import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Remarkety API Key'),
      storeId: z.string().describe('Remarkety Store ID')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Your Remarkety API Key. Found in Settings > API Keys.'),
      storeId: z.string().describe('Your Remarkety Store ID. Found in Settings > API Keys.')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          storeId: ctx.input.storeId
        }
      };
    }
  });
