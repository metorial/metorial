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
    name: 'API Access Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Buildkite API access token. Create one from your Personal Settings > API Access Tokens page.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://api.buildkite.com/v2',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let response = await http.get('/user');
      let user = response.data;

      return {
        profile: {
          id: user.id,
          name: user.name,
          email: user.email,
          imageUrl: user.avatar_url
        }
      };
    }
  });
