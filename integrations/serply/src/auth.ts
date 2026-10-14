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
      token: z.string().describe('Serply API key from your dashboard at app.serply.io')
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Enter your Serply API key from the dashboard.', {
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
