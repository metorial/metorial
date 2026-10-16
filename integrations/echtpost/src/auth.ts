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
      apiKey: z
        .string()
        .describe(
          'EchtPost API key from Account → API keys. Use a sandbox key to avoid billing and printing.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim() || /[\r\n]/.test(ctx.input.apiKey)) {
        throw createApiServiceError('Provide a valid EchtPost API key.');
      }
      return {
        output: {
          token: ctx.input.apiKey.trim()
        }
      };
    }
  });
