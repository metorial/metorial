import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addNone()
  .addTokenAuth({
    type: 'auth.token',
    name: 'npm Access Token',
    key: 'npm_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'An npm access token (session token, granular token, or automation token). Used for authenticated operations like publishing, token management, and accessing private packages.'
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
        baseURL: 'https://registry.npmjs.org',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let res = await http.get('/-/npm/v1/user');
      let user = res.data;

      return {
        profile: {
          name: user.name,
          email: user.email
        }
      };
    }
  });
