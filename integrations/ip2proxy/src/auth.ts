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
          'Your IP2Proxy API key. Found in the License section of your IP2Location account.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter your IP2Proxy API key.', {
          reason: 'missing_auth'
        });
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
