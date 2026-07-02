import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      username: z.string(),
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Access Key',
    key: 'basic_auth',

    inputSchema: z.object({
      username: z.string().describe('Your Sauce Labs username'),
      accessKey: z.string().describe('Your Sauce Labs access key (found in User Settings)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          username: ctx.input.username,
          token: ctx.input.accessKey
        }
      };
    },

    getProfile: async (ctx: {
      output: { username: string; token: string };
      input: { username: string; accessKey: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://api.us-west-1.saucelabs.com',
        auth: {
          username: ctx.output.username,
          password: ctx.output.token
        }
      });

      let response = await http.get(
        `/team-management/v1/users?username=${encodeURIComponent(ctx.output.username)}&limit=1`
      );
      let users = response.data?.users ?? [];
      let user = users[0];

      if (user) {
        return {
          profile: {
            id: user.id,
            email: user.email,
            name:
              [user.first_name, user.last_name].filter(Boolean).join(' ') ||
              ctx.output.username
          }
        };
      }

      return {
        profile: {
          id: ctx.output.username,
          name: ctx.output.username
        }
      };
    }
  });
