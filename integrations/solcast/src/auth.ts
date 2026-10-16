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
      apiKey: z.string().describe('Your Solcast API key from the Solcast Toolkit account page')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError('Enter a Solcast API key from your Toolkit account.');
      return {
        output: {
          token: ctx.input.apiKey.trim()
        }
      };
    }
  });
