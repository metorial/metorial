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
      token: z.string().describe('Your Rafflys API key, found in your account settings')
    }),

    getOutput: async ctx => {
      new Client({ token: ctx.input.token });
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let user = await new Client(ctx.output).getUser();

      return {
        profile: {
          id: user.id.toString(),
          name: user.name,
          email: user.email
        }
      };
    }
  });
