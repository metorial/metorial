import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://app-sorteos.com/api/v2'
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
      token: z.string().describe('Your Rafflys API key, found in your account settings')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await http.get('/users/me', {
        headers: {
          'X-API-KEY': ctx.output.token
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id?.toString(),
          name: user.name || user.username,
          email: user.email
        }
      };
    }
  });
