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
      apiToken: z
        .string()
        .describe(
          'Placid API token from your project settings (Projects → Select Project → API Tokens)'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiToken.trim()) {
        throw createApiServiceError('A Placid API token is required.');
      }
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    }
  });
