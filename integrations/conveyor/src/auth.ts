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
      apiKey: z
        .string()
        .describe(
          'Your Conveyor API key. Generate one from Settings > Integrations > Add Integration > Conveyor API. Select permissions for the operations you need.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError('A Conveyor API key is required.');
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
