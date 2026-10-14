import { SlateAuth } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from './lib/client';

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
        .describe('Your sevDesk API token. Found in Settings > User in the sevDesk web UI.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new SevdeskClient({ token: ctx.output.token });
      await client.getBookkeepingSystemVersion();
      return { profile: {} };
    }
  });
