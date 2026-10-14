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
          'Formsite API access token. Found on Form Settings → Integrations → Formsite API page. Requires a Professional level account.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    }
  });
