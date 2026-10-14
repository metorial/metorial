import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      adminKey: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('TomTom API Key from the Developer Portal'),
      adminKey: z
        .string()
        .optional()
        .describe(
          'Admin Key for Geofencing/Location History APIs (obtained via registration endpoint)'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Provide a TomTom API key from the Developer Portal.');
      }
      return {
        output: {
          token: ctx.input.apiKey,
          adminKey: ctx.input.adminKey
        }
      };
    }
  });
