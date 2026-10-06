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
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Bolna API key from the Developers tab in the Bolna dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string } }) => {
      let user = await new Client(ctx.output.token).getUserInfo();

      return {
        profile: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      };
    }
  });
