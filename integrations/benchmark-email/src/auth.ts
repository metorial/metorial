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
    name: 'Classic API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z.string()
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new Client({ token: ctx.output.token });
      let data = await client.getProfile();
      return {
        profile: {
          id: data.clientId,
          email: data.email || undefined,
          name: [data.firstName, data.lastName].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
