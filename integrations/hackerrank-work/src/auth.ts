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
        .describe('Personal API token generated in HackerRank for Work Settings > API')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiToken.trim())
        throw createApiServiceError('Enter a HackerRank for Work API token.');
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    }
  });
