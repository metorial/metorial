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
        .describe('Your Crustdata API token. Obtain this by signing up at crustdata.com.')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiToken.trim()) {
        throw createApiServiceError('Provide a non-empty Crustdata API token.');
      }
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    }
  });
