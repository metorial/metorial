import { SlateAuth } from 'slates';
import { z } from 'zod';
import { PayhereClient } from './lib/client';

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
          'Payhere API key from your merchant admin at https://app.payhere.co/merchants/integrations'
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
      let user = await new PayhereClient({ token: ctx.output.token }).getUser();

      return {
        profile: {
          id: String(user.userId),
          email: user.email,
          name: user.displayName
        }
      };
    }
  });
