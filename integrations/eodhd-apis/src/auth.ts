import { SlateAuth } from 'slates';
import { z } from 'zod';
import { EodhdClient } from './lib/client';

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
      token: z.string().describe('EODHD API token from your dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new EodhdClient({ token: ctx.output.token });
      let user = await client.getUserInfo();

      return {
        profile: {
          name: user.name,
          email: user.email,
          subscriptionType: user.subscriptionType,
          dailyRateLimit: user.dailyRateLimit
        }
      };
    }
  });
