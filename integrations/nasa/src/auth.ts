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
    name: 'NASA API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('NASA API key obtained from api.nasa.gov. Use DEMO_KEY for light testing.')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Provide a NASA API key or DEMO_KEY.');
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
