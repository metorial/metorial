import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('API Key for account-specific operations (X-API-KEY header)'),
      publicValidationKey: z
        .string()
        .describe('Public Validation Key for read-only operations (Authorization header)')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your API Key. Found under Settings > Account Settings on the More Trees platform.'
        ),
      publicValidationKey: z
        .string()
        .describe(
          'Your Public Validation Key. Found under Settings > Account Settings > API Key or Integration > API on the More Trees platform.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim() || !ctx.input.publicValidationKey.trim()) {
        throw createApiServiceError('Provide both your API Key and Public Validation Key.');
      }

      return {
        output: {
          token: ctx.input.apiKey,
          publicValidationKey: ctx.input.publicValidationKey
        }
      };
    },

    getProfile: async () => ({ profile: { name: 'More Trees' } })
  });
