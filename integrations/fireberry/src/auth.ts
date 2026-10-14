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
    name: 'API Access Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Your Fireberry API Access Token (TokenID). Found under Profile > Account Security > API Access Token.'
        )
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiToken.trim();
      if (!token) throw createApiServiceError('A Fireberry API access token is required.');
      return {
        output: {
          token
        }
      };
    }
  });
