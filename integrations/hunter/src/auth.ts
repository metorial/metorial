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
        .describe('Your Hunter.io API key. Obtain it from https://hunter.io/api-keys')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let http = createAxios({
        baseURL: 'https://api.hunter.io/v2'
      });

      let response = await http.get('/account', {
        headers: {
          'X-API-KEY': ctx.output.token
        }
      });

      let account = response.data.data;

      return {
        profile: {
          id: account.email,
          email: account.email,
          name: `${account.first_name ?? ''} ${account.last_name ?? ''}`.trim() || undefined
        }
      };
    }
  });
