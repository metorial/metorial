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
        .describe('Your SerpApi API key, found at https://serpapi.com/manage-api-key')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let axiosInstance = createAxios({
        baseURL: 'https://serpapi.com'
      });

      let response = await axiosInstance.get('/account.json', {
        params: {
          api_key: ctx.output.token
        }
      });

      let account = response.data;

      return {
        profile: {
          id: account.account_id,
          email: account.account_email,
          name: account.account_email,
          plan: account.plan_name
        }
      };
    }
  });
