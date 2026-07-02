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
          'Clockify API key. Generate from Profile Settings > Advanced tab > Manage API keys.'
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
        baseURL: 'https://api.clockify.me/api/v1'
      });

      let response = await ax.get('/user', {
        headers: {
          'X-Api-Key': ctx.output.token
        }
      });

      let user = response.data;
      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name,
          imageUrl: user.profilePicture
        }
      };
    }
  });
