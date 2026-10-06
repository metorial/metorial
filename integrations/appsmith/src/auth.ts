import { createAuthenticatedAxios, requestAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { adapt, cookie, incomplete, invalid, origin, responseCookies } from './lib/validation';

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Native session cookie value; empty for unauthenticated health and instance information.'
        ),
      instanceUrl: z
        .string()
        .optional()
        .describe('The instance origin that issued the session.'),
      userId: z
        .string()
        .optional()
        .describe('The authenticated user ID verified by the instance.')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Session Login',
    key: 'session_login',
    inputSchema: z.object({
      instanceUrl: z
        .string()
        .describe('The exact HTTPS origin of the Appsmith instance. Localhost may use HTTP.'),
      email: z
        .string()
        .describe(
          'Email for a native password account. SSO-only accounts cannot use this login.'
        ),
      password: z
        .string()
        .describe(
          'The native account password. Failed logins can lock the account for 24 hours.'
        )
    }),
    getOutput: async ctx => {
      const instanceUrl = origin(ctx.input.instanceUrl);
      const email = ctx.input.email;
      if (
        !email ||
        email !== email.trim() ||
        email.length > 320 ||
        !email.includes('@') ||
        Array.from(email).some(c => c.charCodeAt(0) < 32) ||
        !ctx.input.password ||
        ctx.input.password.length > 4096
      )
        throw invalid('Provide the email and password of a native Appsmith password account.');
      const http = createAuthenticatedAxios({
        baseURL: instanceUrl,
        contentType: false,
        maxRedirects: 0,
        timeout: 30000,
        maxContentLength: 1024 * 1024,
        maxBodyLength: 16384,
        errorAdapter: adapt
      });
      const bootstrap = await requestAxios<unknown>(
        'session CSRF prerequisite',
        () => http.get('/api/v1/users/me'),
        adapt
      );
      if (bootstrap.status !== 200) throw incomplete();
      const csrf = responseCookies(bootstrap.headers['set-cookie']).get('XSRF-TOKEN');
      if (!csrf)
        throw invalid(
          'This instance did not issue its native CSRF cookie. Use the dashboard login or a compatible password-login instance.'
        );
      let decoded: string;
      try {
        decoded = decodeURIComponent(csrf);
      } catch {
        throw incomplete();
      }
      cookie(decoded);
      const body = new URLSearchParams({
        username: email,
        password: ctx.input.password
      }).toString();
      const response = await requestAxios<unknown>(
        'session login',
        () =>
          http.post('/api/v1/login', body, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Cookie: `XSRF-TOKEN=${csrf}`,
              'X-XSRF-TOKEN': decoded
            },
            validateStatus: status => [200, 204, 302, 303].includes(status)
          }),
        adapt
      );
      const token = responseCookies(response.headers['set-cookie']).get('SESSION');
      if (!token)
        throw invalid(
          'The instance did not issue a native session. Check password login and SSO settings; inspect the dashboard before another attempt.'
        );
      const user = await new Client({ instanceUrl, token }).getCurrentUser();
      if (user.email.toLowerCase() !== email.toLowerCase()) throw incomplete();
      return { output: { token, instanceUrl, userId: user.id } };
    },
    getProfile: async (ctx: {
      output: { token: string; instanceUrl?: string; userId?: string };
      input: { instanceUrl: string; email: string; password: string };
    }) => {
      const instanceUrl = ctx.output.instanceUrl ?? ctx.input.instanceUrl;
      if (origin(instanceUrl) !== origin(ctx.input.instanceUrl))
        throw invalid('Reconnect to the same instance that issued the session.');
      const user = await new Client({
        instanceUrl,
        token: ctx.output.token,
        userId: ctx.output.userId
      }).getCurrentUser();
      return { profile: { id: user.id, email: user.email, name: user.name } };
    }
  })
  .addNone();
