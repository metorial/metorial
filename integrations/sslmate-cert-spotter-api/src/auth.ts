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
      apiKey: z.string().describe('SSLMate API key, found on your SSLMate account page')
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      if (!token) {
        throw createApiServiceError('Provide an SSLMate API key from your account page.');
      }
      return {
        output: {
          token
        }
      };
    }
  });
