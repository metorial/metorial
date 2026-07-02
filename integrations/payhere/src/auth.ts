import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let apiClient = createAxios({
  baseURL: 'https://api.payhere.co/api/v1'
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
        .describe(
          'Payhere API key from your merchant admin at https://app.payhere.co/merchants/integrations'
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
      let response = await apiClient.get('/user', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data.data;

      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.display_name
        }
      };
    }
  });
