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
          'Your Simplesat API key from Settings > API keys. Grant the scopes needed for the tools you use.'
        )
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      if (!token) {
        throw createApiServiceError(
          'Enter a valid Simplesat API key from Settings > API keys.'
        );
      }
      return {
        output: {
          token
        }
      };
    }
  });
