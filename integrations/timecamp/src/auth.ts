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
          'Your TimeCamp API token. Find it in Profile Settings at https://app.timecamp.com/app#/settings/users/me'
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
        baseURL: 'https://www.timecamp.com/third_party/api'
      });

      let response = await axios.get('/me', {
        headers: {
          Authorization: ctx.output.token
        }
      });

      let user = response.data;

      return {
        profile: {
          id: String(user.user_id),
          email: user.email,
          name: user.display_name
        }
      };
    }
  });
