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
    name: 'Server Access Token',
    key: 'server_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Server Access Token from your Wit.ai app settings. Found under Settings in the Wit.ai console.'
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
