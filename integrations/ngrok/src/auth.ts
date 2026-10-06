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
          'ngrok API key token from the dashboard API Keys page. Use the token value, not the ak_ resource ID or an agent authtoken.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError('An ngrok API key token is required.');
      return {
        output: {
          token: ctx.input.apiKey.trim()
        }
      };
    }
  });
