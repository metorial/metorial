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
        .describe('Your Supportivekoala API key from your existing account settings')
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim() || /[\r\n]/.test(ctx.input.token)) {
        throw createApiServiceError('A valid Supportivekoala API key is required.');
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
