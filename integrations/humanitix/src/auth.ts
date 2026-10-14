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
          'Your Humanitix public API key. Found under Account > Advanced > Public API Key.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter your Humanitix public API key.');
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
