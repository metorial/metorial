import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Session cookie value for authenticated API access. Leave empty for unauthenticated endpoints (health check, instance info).'
        )
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Session Login',
    key: 'session_login',

    inputSchema: z.object({
      instanceUrl: z.string().describe('The base URL of the Appsmith instance.'),
      email: z.string().describe('The email address used to log in to Appsmith.'),
      password: z.string().describe('The password for the Appsmith account.')
    }),

    getOutput: async ctx => {
      let ax = createAxios({
        baseURL: ctx.input.instanceUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let response = await ax.post(
        '/api/v1/login',
        `username=${encodeURIComponent(ctx.input.email)}&password=${encodeURIComponent(ctx.input.password)}`,
        {
          maxRedirects: 0,
          validateStatus: (status: number) => status < 400
        }
      );

      let setCookieHeaders = response.headers['set-cookie'];
      let sessionCookie = '';

      if (setCookieHeaders) {
        let cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
        for (let cookie of cookies) {
          let match = cookie.match(/SESSION=([^;]+)/);
          if (match) {
            sessionCookie = match[1] as string;
            break;
          }
        }
      }

      if (!sessionCookie) {
        sessionCookie = response.data?.sessionId ?? '';
      }

      return {
        output: {
          token: sessionCookie
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string };
      input: { instanceUrl: string; email: string; password: string };
    }) => {
      let ax = createAxios({
        baseURL: ctx.input.instanceUrl,
        headers: {
          Cookie: `SESSION=${ctx.output.token}`
        }
      });

      let response = await ax.get('/api/v1/users/me');
      let user = response.data?.data ?? {};

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      };
    }
  })
  .addNone();
