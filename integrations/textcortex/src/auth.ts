import { SlateAuth } from 'slates';
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
      token: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Your TextCortex API key. Generate one at https://app.textcortex.com/user/dashboard/settings/api-key'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token.trim()
        }
      };
    }
  });
