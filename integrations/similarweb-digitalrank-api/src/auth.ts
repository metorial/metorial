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
          'Your active Similarweb API key. Account admins can generate one under Settings > Account > API > Standard API / Batch API.'
        )
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      if (!token) {
        throw createApiServiceError('Provide an active Similarweb API key.');
      }
      return {
        output: {
          token
        }
      };
    }
  });
