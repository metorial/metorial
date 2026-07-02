import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Pilvio API token')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z.string().describe('Pilvio API token. Generate one at https://app.pilvio.com/')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token
      }
    }),
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let axios = createAxios({
        baseURL: 'https://api.pilvio.com/v1',
        headers: {
          apikey: ctx.output.token
        }
      });

      let response = await axios.get('/user-resource/user');
      let user = response.data;

      return {
        profile: {
          id: user.cookie_id || user.id,
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined
        }
      };
    }
  });
