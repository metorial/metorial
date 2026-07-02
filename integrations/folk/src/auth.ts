import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://api.folk.app/v1'
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
      apiKey: z.string().describe('Folk API key from Settings > API')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let response = await http.get('/users/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });
      let user = response.data.data;
      return {
        profile: {
          id: user.id,
          name: user.fullName,
          email: user.email
        }
      };
    }
  });
