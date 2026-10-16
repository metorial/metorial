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
          'MoonClerk API key. Generate one at https://app.moonclerk.com/settings/api-key'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('A MoonClerk API key is required.', {
          reason: 'missing_api_key'
        });
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
