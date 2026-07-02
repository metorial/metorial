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
    name: 'API Key (Authkey)',
    key: 'api_key',
    inputSchema: z.object({
      authkey: z
        .string()
        .describe(
          'MSG91 authentication key (Authkey). Found in the MSG91 panel under the username dropdown.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.authkey
        }
      };
    }
  });
