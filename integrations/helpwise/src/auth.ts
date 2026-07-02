import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
      let axios = createAxios({
        baseURL: 'https://app.helpwise.io/dev-apis'
      });

      let response = await axios.request({
        method: 'GET',
        url: '/v1/users/me',
        headers: {
          Authorization: ctx.output.token,
          Accept: 'application/json'
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id?.toString(),
          email: user.email,
          name: user.name || user.full_name
        }
      };
    }
  });
