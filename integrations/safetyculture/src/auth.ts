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
          'SafetyCulture API token. Generate one from your profile settings in the SafetyCulture web app.'
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
        baseURL: 'https://api.safetyculture.io',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/users/v1/users/me');
      let user = response.data;

      return {
        profile: {
          id: user.user_id || user.id,
          email: user.email,
          name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.email
        }
      };
    }
  });
