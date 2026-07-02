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
          'A Sanity robot token or personal token. Robot tokens are recommended for integrations. Generate one at Settings > API > Tokens in your project management console.'
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
      let ax = createAxios({
        baseURL: 'https://api.sanity.io/v2024-01-01'
      });

      let response = await ax.get('/users/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;
      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name,
          imageUrl: user.profileImage
        }
      };
    }
  });
