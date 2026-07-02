import { SlateAuth } from 'slates';
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
    key: 'api_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Retool API access token. Organization admins can create access tokens from Settings > API.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
