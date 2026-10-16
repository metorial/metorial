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
    name: 'API Secret Key',
    key: 'api_secret_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Secret API key from Dev Tools → Keys & IDs in the Memberstack dashboard (sk_sb_ for sandbox or sk_ for live)'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('A Memberstack secret API key is required.');
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
