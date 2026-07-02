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
    name: 'Personal Auth Token',
    key: 'personal_auth_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Bugsnag Personal Auth Token. Generate one in the Bugsnag dashboard under My Account → Personal Auth Tokens.'
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
        baseURL: 'https://api.bugsnag.com',
        headers: {
          Authorization: `token ${ctx.output.token}`
        }
      });

      let response = await axios.get('/user');
      let user = response.data;

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      };
    }
  });
