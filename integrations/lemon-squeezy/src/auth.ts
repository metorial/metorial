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
          'Your Lemon Squeezy API key. Create one at Settings > API in your dashboard.'
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
        baseURL: 'https://api.lemonsqueezy.com/v1'
      });

      let response = await client.get('/users/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          Accept: 'application/vnd.api+json'
        }
      });

      let user = response.data?.data?.attributes;

      return {
        profile: {
          id: response.data?.data?.id,
          name: user?.name,
          email: user?.email,
          imageUrl: user?.avatar_url
        }
      };
    }
  });
