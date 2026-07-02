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
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Mixmax API token generated from Settings → Integrations → Create Mixmax API Token'
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
        baseURL: 'https://api.mixmax.com/v1',
        headers: {
          'X-API-Token': ctx.output.token
        }
      });

      let response = await http.get('/users/me');
      let user = response.data;

      return {
        profile: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      };
    }
  });
