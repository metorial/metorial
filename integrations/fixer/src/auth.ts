import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiHost: z.enum(['apilayer', 'fixer']).optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('API key for the selected Fixer API host'),
      apiHost: z
        .enum(['apilayer', 'fixer'])
        .optional()
        .describe(
          'API host associated with this key: apilayer for an APILayer Marketplace key (default), or fixer for a fixer.io account access key.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter a non-empty Fixer API key.', {
          reason: 'fixer_missing_api_key'
        });
      }
      return {
        output: {
          token: ctx.input.token,
          apiHost: ctx.input.apiHost ?? 'apilayer'
        }
      };
    }
  });
