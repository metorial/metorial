import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      loginEmail: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      loginEmail: z
        .string()
        .describe('The email address associated with your Re:amaze account'),
      token: z
        .string()
        .describe('Your Re:amaze API token (found in Settings > Developer > API Token)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          loginEmail: ctx.input.loginEmail
        }
      };
    }
  });
