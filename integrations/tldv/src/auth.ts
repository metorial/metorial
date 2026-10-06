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
      apiKey: z
        .string()
        .min(1)
        .describe(
          'tl;dv API key. Generate one at https://tldv.io/app/settings/personal-settings/api-keys. API access requires an eligible Pro, Business or Enterprise plan.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
