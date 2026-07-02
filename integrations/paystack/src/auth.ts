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
    name: 'Secret Key',
    key: 'secret_key',
    inputSchema: z.object({
      secretKey: z.string()
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.secretKey
        }
      };
    }
  });
