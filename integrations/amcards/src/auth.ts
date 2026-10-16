import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, resourceId } from './lib/client';

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
          'Your AMcards access token. Generate one at https://amcards.com/user/generate-access-token/.'
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
      let { user } = await new Client({ token: ctx.output.token }).getUser();

      return {
        profile: {
          id: resourceId(user)!,
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
          email: user.email || undefined
        }
      };
    }
  });
