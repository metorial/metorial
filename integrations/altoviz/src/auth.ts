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
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Altoviz API key. Obtain it from Settings > API access in your Altoviz account.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://api.altoviz.com/v1'
      });

      let response = await axios.get('/Users/me', {
        headers: {
          'X-API-KEY': ctx.output.token
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id?.toString(),
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
