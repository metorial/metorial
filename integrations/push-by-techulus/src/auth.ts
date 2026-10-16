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
          'Your Push by Techulus API key. Found in the console integrations page or the Account tab in the mobile app. Use an account API key for personal notifications or a team API key for team notifications.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter your Push by Techulus API key.', {
          reason: 'push_by_techulus_api_key_required'
        });
      }

      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
