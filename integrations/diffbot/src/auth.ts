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
      apiToken: z.string()
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiToken.trim()) {
        throw createApiServiceError('Enter a valid Diffbot API token.');
      }
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    }
  });
