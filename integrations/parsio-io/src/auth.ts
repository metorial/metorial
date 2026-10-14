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
        .describe('Your Parsio.io API key, found at https://app.parsio.io/account')
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      if (!token || /[\r\n]/.test(token)) {
        throw createApiServiceError(
          'Enter a valid Parsio API key from your account settings.',
          {
            reason: 'invalid_api_key'
          }
        );
      }
      return {
        output: {
          token
        }
      };
    }
  });
