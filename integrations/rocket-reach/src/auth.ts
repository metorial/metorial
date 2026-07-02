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
        .describe('Your RocketReach API key. Generate one in Account Settings.')
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
        baseURL: 'https://api.rocketreach.co/api/v2'
      });

      let response = await axios.get('/account', {
        headers: {
          'Api-Key': ctx.output.token
        }
      });

      let data = response.data;

      return {
        profile: {
          id: String(data.id),
          email: data.email ?? undefined,
          name: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
