import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let httpClient = createAxios({
  baseURL: 'https://circleci.com/api/v2'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal API Token',
    key: 'personal_api_token',

    inputSchema: z.object({
      token: z.string().describe('CircleCI Personal API Token')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let response = await httpClient.get('/me', {
        headers: {
          'Circle-Token': ctx.output.token
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.id,
          name: user.name,
          email: user.login
        }
      };
    }
  });
