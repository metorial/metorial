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
          'Travis CI API access token. Obtain from Account Settings > API Token in the Travis CI dashboard, or via the Travis CI CLI.'
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
      let client = createAxios({
        baseURL: 'https://api.travis-ci.com',
        headers: {
          Authorization: `token ${ctx.output.token}`,
          'Travis-API-Version': '3'
        }
      });

      let response = await client.get('/user');
      let user = response.data;

      return {
        profile: {
          id: String(user.id),
          name: user.name || user.login,
          email: user.email,
          imageUrl: user.avatar_url,
          login: user.login
        }
      };
    }
  });
