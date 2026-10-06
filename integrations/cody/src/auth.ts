import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().min(1)
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('Cody API key from https://getcody.ai/settings/api')
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('Enter a nonempty Cody API key.');
      return {
        output: {
          token: ctx.input.token.trim()
        }
      };
    }
  });
