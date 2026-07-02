import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Account-level API Secret Key for business endpoints')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Secret Key',
    key: 'api_secret_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Account-level API Secret Key from the API section in account settings')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
