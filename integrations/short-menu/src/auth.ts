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
        .describe('Your Short Menu API key. Create one at https://shm.to/create-api-key')
    }),

    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      if (!token) {
        throw createApiServiceError(
          'Enter a Short Menu API key from https://shm.to/create-api-key.'
        );
      }

      return {
        output: {
          token
        }
      };
    }
  });
