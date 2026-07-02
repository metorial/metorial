import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Split Admin API key (Bearer token)')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Admin API Key',
    key: 'admin_api_key',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Split Admin API key. Generate one from Split UI under Admin Settings > API Keys with the Admin role.'
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
