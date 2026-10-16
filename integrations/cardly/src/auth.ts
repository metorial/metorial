import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Cardly API key (starts with test_ or live_)')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) throw createApiServiceError('Provide a Cardly API key.');
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
