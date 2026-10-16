import { SlateAuth } from 'slates';
import { z } from 'zod';
import { ListcleanClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe('Listclean API key used for authentication via X-Auth-Token header')
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
          'Your Listclean API token. Generate one from the API Tokens section in your account settings.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      let client = new ListcleanClient({ token: ctx.output.token });
      let profile = await client.getAccountProfile();

      return {
        profile: {
          name: profile.name
        }
      };
    }
  });
