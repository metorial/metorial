import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      email: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      email: z.string().describe('Your email address used as the HTTP Basic Auth username'),
      token: z
        .string()
        .describe('Your DeployHQ API key (40-character string found in Settings > Security)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          email: ctx.input.email
        }
      };
    }
  });
