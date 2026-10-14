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
          'Your Tisane API key (Ocp-Apim-Subscription-Key). Obtain from the Tisane Labs Developer Portal.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter a non-empty Tisane API key.');
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
