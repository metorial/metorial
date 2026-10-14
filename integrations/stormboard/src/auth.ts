import { SlateAuth } from 'slates';
import { z } from 'zod';
import { StormboardClient } from './lib/client';

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
          'Your Stormboard API key. Found at https://www.stormboard.com/users/account#api'
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
      let client = new StormboardClient({ token: ctx.output.token });
      let user = await client.getUser();

      return {
        profile: {
          id: user.id == null ? undefined : String(user.id),
          name: user.name || user.full || undefined,
          email: user.email || undefined
        }
      };
    }
  });
