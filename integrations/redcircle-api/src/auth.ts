import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('RedCircle API key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your RedCircle API key. Sign up at https://app.redcircleapi.com/signup to obtain one.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let data = await new Client({ token: ctx.output.token }).getAccount();
      let account = data.account_info;

      return {
        profile: {
          id: account?.email,
          email: account?.email,
          name: account?.name
        }
      };
    }
  });
