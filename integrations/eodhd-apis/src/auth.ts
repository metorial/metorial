import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
      let client = createAxios({
        baseURL: 'https://eodhd.com/api'
      });

      let response = await client.get('/user', {
        params: {
          api_token: ctx.output.token,
          fmt: 'json'
        }
      });

      let user = response.data;

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
