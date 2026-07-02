import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://api.bolna.ai'
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
      token: z
        .string()
        .describe('Bolna API key from the Developers tab in the Bolna dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await http.get('/user/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      };
    }
  });
