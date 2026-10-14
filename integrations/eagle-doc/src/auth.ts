import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Eagle Doc API key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Your Eagle Doc API key from your subscription dashboard')
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Provide a nonempty Eagle Doc API key.');
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
