import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Planyo API key'),
      hashKey: z.string().optional().describe('Optional hash key for enhanced security')
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
          'Your Planyo API key. Found at https://www.planyo.com/api.php under the "API Key" button.'
        ),
      hashKey: z
        .string()
        .optional()
        .describe(
          'Optional secret hash key for enhanced security. When enabled, all API calls include a timestamp-based HMAC.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          hashKey: ctx.input.hashKey
        }
      };
    }
  });
