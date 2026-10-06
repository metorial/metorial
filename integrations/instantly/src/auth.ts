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
      token: z
        .string()
        .describe(
          'Instantly V2 API key from Settings → Integrations → API Keys. V1 keys cannot authenticate V2 endpoints. Grant only the resource permissions required by the tools you use.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim() || /[\r\n]/.test(ctx.input.token)) {
        throw createApiServiceError('Provide an Instantly V2 API key.');
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
