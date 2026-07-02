import { SlateAuth } from 'slates';
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
      return {
        output: {
          token: ctx.input.apiKey,
          adminKey: ctx.input.adminKey
        }
      };
    }
  });
