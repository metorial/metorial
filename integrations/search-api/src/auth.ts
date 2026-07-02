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
      apiKey: z.string().describe('SearchApi.io API key')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let axios = createAxios({
        baseURL: 'https://www.searchapi.io/api/v1'
      });

      let response = await axios.get('/account', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let account = response.data;

      return {
        profile: {
          id: account.email || account.api_key || 'unknown',
          email: account.email,
          name: account.name
        }
      };
    }
  });
