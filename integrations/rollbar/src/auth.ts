import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let http = createAxios({
  baseURL: 'https://api.rollbar.com/api/1'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Project Access Token',
    key: 'project_access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Rollbar project access token. Found in Project → Settings → Project Access Tokens.'
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
      let response = await http.get('/user', {
        headers: {
          'X-Rollbar-Access-Token': ctx.output.token
        }
      });

      let user = response.data?.result;

      return {
        profile: {
          id: user?.id?.toString(),
          email: user?.email,
          name: user?.username
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Account Access Token',
    key: 'account_access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Rollbar account access token. Found in Account Settings → Account Access Tokens.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
