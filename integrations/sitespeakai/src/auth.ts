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
          'Your SiteSpeakAI API token. Generate one from the Account page at https://sitespeak.ai/user/api-tokens'
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
        baseURL: 'https://api.sitespeak.ai/v1'
      });

      let response = await client.get('/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/json'
        }
      });

      let user = response.data.user ?? response.data;

      return {
        profile: {
          id: user.id?.toString(),
          email: user.email,
          name: user.name,
          imageUrl: user.profile_photo_url ?? user.avatar
        }
      };
    }
  });
