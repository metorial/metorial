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
    name: 'API License Key',
    key: 'api_license_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Your Interzoid API license key')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('An Interzoid API license key is required.');
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
