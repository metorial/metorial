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
      token: z
        .string()
        .describe(
          'Your Stormboard API key. Found at https://www.stormboard.com/users/account#api'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let http = createAxios({
        baseURL: 'https://api.stormboard.com',
        headers: {
          'X-API-Key': ctx.output.token,
          'Content-Type': 'application/json'
        }
      });

      let response = await http.get('/users');
      let user = response.data;

      return {
        profile: {
          id: user.id?.toString(),
          name: user.name || user.full || undefined,
          email: user.email || undefined
        }
      };
    }
  });
