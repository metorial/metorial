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
    name: 'API Key (Client ID)',
    key: 'api_key',
    inputSchema: z.object({
      clientId: z
        .string()
        .describe(
          'Your RiteKit Client ID. Create one at https://ritekit.com/developer/dashboard/'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.clientId
        }
      };
    }
  });
