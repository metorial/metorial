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
          'Mapulus API key. Generate one from your Mapulus account under Profile > API Keys.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter a Mapulus API key from Profile > API Keys.');
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
