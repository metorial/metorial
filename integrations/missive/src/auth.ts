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
        .describe('Missive Personal Access Token. Found in Missive Preferences > API tab.')
    }),

    getOutput: async ctx => {
      let token = ctx.input.token.trim();
      if (!token)
        throw createApiServiceError('Enter a Missive API token from Preferences > API.');
      return {
        output: {
          token
        }
      };
    }
  });
