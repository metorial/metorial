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
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .trim()
        .min(1)
        .describe('Codemagic API token. Found at Account settings > API token.')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiToken
      }
    })
  });
