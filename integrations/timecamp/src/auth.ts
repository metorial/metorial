import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

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
      token: z
        .string()
        .describe(
          'Your TimeCamp API token. Find it in Profile Settings at https://app.timecamp.com/app#/settings/users/me'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let user = await new Client({ token: ctx.output.token }).getCurrentUser();

      return {
        profile: {
          id: String(user.user_id),
          email: user.email ?? undefined,
          name: user.display_name ?? user.email ?? String(user.user_id)
        }
      };
    }
  });
