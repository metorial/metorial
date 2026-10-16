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
      apiKey: z.string().describe('IQAir AirVisual API key from the IQAir dashboard API page')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Provide a non-empty IQAir AirVisual API key.', {
          reason: 'iqair_missing_api_key'
        });
      }
      return {
        output: {
          token: ctx.input.apiKey.trim()
        }
      };
    }
  });
