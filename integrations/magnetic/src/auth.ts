import { SlateAuth } from 'slates';
import { z } from 'zod';
import { MagneticClient } from './lib/client';

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
          'Your Magnetic API token. Find it at https://app.magnetichq.com/Magnetic/API.do while logged in.'
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
      let user = await new MagneticClient({ token: ctx.output.token }).getUser();

      return {
        profile: {
          id: String(user.id),
          name: typeof user.fullName === 'string' ? user.fullName : String(user.id),
          email: typeof user.email === 'string' ? user.email : undefined
        }
      };
    }
  });
