import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Freshdesk API key used for Basic Authentication')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Your Freshdesk API key. Find it under Profile Settings > View API key.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (_ctx: any) => {
      // We cannot fetch the profile without the subdomain (which is in config, not auth).
      // Return a minimal profile with the token present indication.
      return {
        profile: {
          name: 'Freshdesk Agent'
        }
      };
    }
  });
