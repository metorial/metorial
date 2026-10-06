import { SlateAuth } from 'slates';
import { z } from 'zod';
import { instanceUrl, sudoUsername, token } from './lib/validation';

const instance = z
  .string()
  .describe(
    'Sourcegraph instance URL. HTTPS self-hosted instances and HTTP localhost development are supported. Saved with these credentials.'
  );

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authorizationHeader: z.string(),
      instanceUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Personal or service-account access token from the instance user settings.'),
      instanceUrl: instance
    }),
    getOutput: async ctx => {
      const credential = token(ctx.input.token);
      return {
        output: {
          token: credential,
          authorizationHeader: `token ${credential}`,
          instanceUrl: instanceUrl(ctx.input.instanceUrl)
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Sudo Access Token',
    key: 'sudo_token',
    inputSchema: z.object({
      token: z.string().describe('Access token with site-admin:sudo scope.'),
      sudoUsername: z
        .string()
        .describe('Username to act as; the current-user tool reports the effective user.'),
      instanceUrl: instance
    }),
    getOutput: async ctx => {
      const credential = token(ctx.input.token);
      const username = sudoUsername(ctx.input.sudoUsername);
      return {
        output: {
          token: credential,
          authorizationHeader: `token-sudo user="${username}",token="${credential}"`,
          instanceUrl: instanceUrl(ctx.input.instanceUrl)
        }
      };
    }
  });
