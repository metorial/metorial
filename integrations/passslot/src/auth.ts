import { createApiServiceError, SlateAuth } from 'slates';
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
      if (!ctx.input.appKey.trim()) {
        throw createApiServiceError('Enter a PassSlot App Key.');
      }
      return {
        output: {
          token: ctx.input.appKey
        }
      };
    }
  });
