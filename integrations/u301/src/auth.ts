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
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your U301 API key (starts with oat_). Create one at https://u301.com/dashboard/settings/api-key'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token
      }
    })
  });
