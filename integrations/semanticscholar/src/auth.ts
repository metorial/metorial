import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().optional()
    })
  )
  .addNone()
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Semantic Scholar API key for higher rate limits. Request one at https://www.semanticscholar.org/product/api#api-key-form'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError('Provide a non-empty Semantic Scholar API key.');
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
