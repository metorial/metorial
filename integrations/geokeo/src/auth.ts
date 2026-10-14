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
      apiKey: z.string().describe('Geokeo API key from the dashboard (API tab)')
    }),

    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      if (!token) {
        throw createApiServiceError('Enter the Geokeo API key from the dashboard API tab.', {
          reason: 'geokeo_missing_api_key'
        });
      }

      return {
        output: {
          token
        }
      };
    }
  });
