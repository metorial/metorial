import { SlateAuth } from 'slates';
import { z } from 'zod';
import { fail, text } from './lib/validation';

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
        .describe(
          'Roam Research API token generated from Settings > Graph > API Tokens. Use a backend graph token with read-only or read+edit permission for a non-encrypted hosted graph. Desktop local and append-only tokens are unsupported.'
        )
    }),
    getOutput: async ctx => {
      const token = text(ctx.input.apiToken, 'Backend graph token', 8192);
      if (/\s/.test(token))
        fail('Enter the raw backend graph token without spaces or a Bearer prefix.');
      return {
        output: {
          token
        }
      };
    }
  });
