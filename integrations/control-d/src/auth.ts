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
        .describe('Control D API token generated from the dashboard under the API section')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = createAxios({
        baseURL: 'https://api.controld.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/json'
        }
      });

      let response = await client.get('/users');
      let user = response.data.body;

      return {
        profile: {
          id: user.PK,
          email: user.email
        }
      };
    }
  });
