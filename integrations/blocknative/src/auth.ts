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
          'Existing Blocknative API key. The provider announced API shutdown after June 19, 2026.'
        )
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      if (!token) {
        throw createApiServiceError('Enter a non-empty Blocknative API key.', {
          reason: 'blocknative_missing_api_key'
        });
      }

      return {
        output: {
          token
        }
      };
    }
  });
