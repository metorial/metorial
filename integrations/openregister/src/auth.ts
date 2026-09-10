import { SlateAuth } from 'slates';
import { z } from 'zod';

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    key: 'api_key',
    name: 'API Key',
    inputSchema: z.object({
      api_key: z
        .string()
        .trim()
        .min(1)
        .describe('OpenRegister API key. Create one at https://openregister.de/keys.')
    }),
    getOutput: async ctx => ({ output: { token: ctx.input.api_key } })
  });
