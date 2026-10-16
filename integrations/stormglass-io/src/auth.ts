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
      apiKey: z.string().describe('Stormglass.io API key from your dashboard at stormglass.io')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError(
          'Provide a nonblank Stormglass API key from your dashboard.'
        );
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
