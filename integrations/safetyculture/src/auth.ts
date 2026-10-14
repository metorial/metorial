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
          'SafetyCulture API token. Generate one from your profile settings in the SafetyCulture web app.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('A SafetyCulture API token is required.');
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
