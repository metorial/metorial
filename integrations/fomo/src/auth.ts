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
          'Fomo API token. Found in Settings > Site > select your website > scroll to the bottom, or in App > API Access.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter the Fomo API token for your selected website.');
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
