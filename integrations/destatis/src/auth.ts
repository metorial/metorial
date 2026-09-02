import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    key: 'api_token',
    name: 'API Token',
    inputSchema: z.object({
      token: z
        .string()
        .trim()
        .min(1)
        .describe('Personal token from the GENESIS-Online API profile.')
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.token } })
  });
