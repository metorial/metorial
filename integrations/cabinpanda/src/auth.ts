import { SlateAuth } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from './lib/client';

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
        .describe('CabinPanda API token. Generate one from your CabinPanda account settings.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new CabinPandaClient({ token: ctx.output.token });
      let profile = await client.getProfile();

      return {
        profile: {
          id: profile?.id?.toString(),
          email: profile?.email ?? undefined,
          name: profile?.name ?? undefined
        }
      };
    }
  });
