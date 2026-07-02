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
    name: 'App Key',
    key: 'app_key',
    inputSchema: z.object({
      appKey: z.string().describe('PassSlot App Key used for API authentication')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.appKey
        }
      };
    }
  });
