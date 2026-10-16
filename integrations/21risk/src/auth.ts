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
          'API key generated from your 21RISK account at https://app.21risk.com/profile/account'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('A 21RISK API key is required.', {
          reason: 'missing_api_key'
        });
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
