import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { requireText } from './lib/validation';

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
        .describe('Your Zylvie API key, found under Settings > API in your Zylvie dashboard')
    }),

    getOutput: async ctx => {
      requireText(ctx.input.token, 'API key');
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let account = await new Client({ token: ctx.output.token }).getMe();

      return {
        profile: {
          email: account.email,
          name: account.brand
        }
      };
    }
  });
