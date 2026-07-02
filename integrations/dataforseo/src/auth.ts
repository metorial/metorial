import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'Basic Auth',
    key: 'basic_auth',

    inputSchema: z.object({
      login: z.string().describe('Your DataForSEO API login (same as your account email)'),
      password: z
        .string()
        .describe(
          'Your DataForSEO API password (found in Dashboard > API Access section, different from your account password)'
        )
    }),

    getOutput: async ctx => {
      let encoded = Buffer.from(`${ctx.input.login}:${ctx.input.password}`).toString('base64');
      return {
        output: {
          token: encoded
        }
      };
    }
  });
