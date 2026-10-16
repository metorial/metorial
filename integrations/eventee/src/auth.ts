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
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Eventee Public API token. Generate from your event Settings -> Features -> Public API.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim() || /[\r\n]/.test(ctx.input.token)) {
        throw createApiServiceError('Provide a valid Eventee Public API token.');
      }
      return {
        output: {
          token: ctx.input.token.trim()
        }
      };
    }
  });
