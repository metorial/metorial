import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key & Secret',
    key: 'api_key_secret',

    inputSchema: z.object({
      apiKey: z.string().describe('Your Helpwise API Key'),
      apiSecret: z.string().describe('Your Helpwise API Secret')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: `${ctx.input.apiKey}:${ctx.input.apiSecret}`
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: { apiKey: string; apiSecret: string };
    }) => {
      let user = await new Client({ token: ctx.output.token }).getMe();

      return {
        profile: {
          id: user.id?.toString(),
          email: user.email,
          name:
            user.name ||
            user.full_name ||
            user.displayName ||
            [user.firstname, user.lastname].filter(Boolean).join(' ')
        }
      };
    }
  });
