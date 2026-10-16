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
          'StoreRocket API token created in Dashboard > API Tokens; requires Business API access and location:read for reads or location:update for updates'
        )
    }),

    getOutput: async ctx => {
      let token = ctx.input.token.trim();
      if (!token) {
        throw createApiServiceError('A StoreRocket API token is required.');
      }
      return { output: { token } };
    }
  });
