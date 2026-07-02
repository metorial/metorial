import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Nango Secret Key used for API authentication')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Secret Key',
    key: 'secret_key',
    inputSchema: z.object({
      secretKey: z.string().describe('Your Nango Secret Key from Environment Settings')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.secretKey
        }
      };
    }
  });
