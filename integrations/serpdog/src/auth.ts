import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axiosInstance = createAxios({
  baseURL: 'https://api.serpdog.io'
});

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
      apiKey: z.string().describe('Your Serpdog API key')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let response = await axiosInstance.get('/account_info', {
        params: {
          api_key: ctx.output.token
        }
      });

      let data = response.data;

      return {
        profile: {
          email: data.email,
          name: data.name || data.email,
          plan: data.plan_name
        }
      };
    }
  });
