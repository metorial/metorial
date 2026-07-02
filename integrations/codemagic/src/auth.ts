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
        .describe(
          'Codemagic API token. Found at Teams > Personal Account > Integrations > Codemagic API > Show.'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiToken
      }
    })
  });
