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
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Claid.ai API key. Generate one from the Claid.ai dashboard under Overview or API keys.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter a non-empty Claid.ai API key.');
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
