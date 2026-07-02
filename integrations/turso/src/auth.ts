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
          'Your Turso Platform API token. Create one using the Turso CLI or the Platform API.'
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
      let axios = createAxios({
        baseURL: 'https://api.turso.tech',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await axios.get('/v1/auth/api-tokens/validate');
      let data = response.data as { exp: number };

      return {
        profile: {
          id: 'turso-user',
          name: `Token expires: ${data.exp === -1 ? 'never' : new Date(data.exp * 1000).toISOString()}`
        }
      };
    }
  });
