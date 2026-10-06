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
      token: z
        .string()
        .describe(
          'Hightouch workspace API key from Settings > API keys. The key inherits its selected user group permissions and requires its creator to retain workspace access.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim() || /[\r\n]/.test(ctx.input.token))
        throw createApiServiceError('Provide a valid Hightouch workspace API key.');
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
