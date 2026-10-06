import { SlateAuth } from 'slates';
import { z } from 'zod';
import { validateToken } from './lib/transport';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Secret Key',
    key: 'secret_key',
    inputSchema: z.object({
      secretKey: z
        .string()
        .describe(
          'Paystack test or live secret key. Public keys cannot authorize backend operations.'
        )
    }),
    getOutput: async ctx => {
      validateToken(ctx.input.secretKey);
      return {
        output: {
          token: ctx.input.secretKey
        }
      };
    }
  });
