import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authorizationHeader: z.string()
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
          'Sourcegraph access token. Generate one at https://<your-instance>/user/settings/tokens'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authorizationHeader: `token ${ctx.input.token}`
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Sudo Access Token',
    key: 'sudo_token',
    inputSchema: z.object({
      token: z.string().describe('Sourcegraph sudo access token with site-admin:sudo scope'),
      sudoUsername: z.string().describe('Username to perform actions as')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authorizationHeader: `token-sudo user="${ctx.input.sudoUsername}",token="${ctx.input.token}"`
        }
      };
    }
  });
