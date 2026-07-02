import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Auth Token',
    key: 'auth_token',
    inputSchema: z.object({
      authToken: z
        .string()
        .describe('Botbaba auth token. Found in your profile page at https://app.botbaba.io')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.authToken
        }
      };
    }
  });
