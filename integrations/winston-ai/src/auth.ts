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
        .describe('API token from the Winston AI Developer Dashboard (dev.gowinston.ai)')
    }),
    getOutput: async ctx => {
      let token = ctx.input.token.trim();
      if (!token) {
        throw createApiServiceError(
          'Provide an API token from the Winston AI Developer Dashboard.'
        );
      }
      return {
        output: {
          token
        }
      };
    }
  });
