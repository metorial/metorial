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
      apiKey: z.string().describe('Your Deadline Funnel API key for account REST access.')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Deadline Funnel API key must not be blank.', {
          reason: 'deadline_funnel_invalid_auth'
        });
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
