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
          'Your MemberVault API key. Found in the admin panel under Integrations → Other, in the "Webhooks API" section.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter your MemberVault API key.', {
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
