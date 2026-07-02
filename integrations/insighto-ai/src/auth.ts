import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let axios = createAxios({
  baseURL: 'https://api.insighto.ai'
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
      apiKey: z.string().describe('Insighto.ai API key (starts with "in-")')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let response = await axios.get('/api/v1/user', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      let user = response.data?.data || response.data;
      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name || user.first_name
        }
      };
    }
  });
