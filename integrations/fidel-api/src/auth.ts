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
    name: 'Secret API Key',
    key: 'secret_api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Fidel API secret key. Prefixed with sk_test_ (test mode) or sk_live_ (live mode). Found in your Fidel dashboard account page.'
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
