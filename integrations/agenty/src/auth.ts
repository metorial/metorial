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
          'Your Agenty API key. Found under Settings > API Keys in your Agenty account.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter a valid Agenty API key from Settings > API Keys.');
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
