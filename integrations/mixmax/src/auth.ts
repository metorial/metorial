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
          'Mixmax API token generated from Settings → Integrations → Create Mixmax API Token'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string } }) => {
      let user = await new Client({ token: ctx.output.token }).getCurrentUser();

      return {
        profile: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      };
    }
  });
