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
    name: 'Access Token',
    key: 'access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Pulumi access token (Personal, Organization, or Team access token). Create one at https://app.pulumi.com/account/tokens'
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
        baseURL: 'https://api.pulumi.com'
      });

      let response = await axios.get('/api/user', {
        headers: {
          Authorization: `token ${ctx.output.token}`,
          Accept: 'application/vnd.pulumi+8',
          'Content-Type': 'application/json'
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.githubLogin || user.name,
          name: user.name,
          email: user.email,
          imageUrl: user.avatarUrl
        }
      };
    }
  });
