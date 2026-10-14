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
        .describe('Your Placekey API key. You can generate one from your Placekey dashboard.')
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      if (!token) {
        throw createApiServiceError('Provide a non-empty Placekey API key.', {
          reason: 'placekey_api_key_required'
        });
      }
      return {
        output: {
          token
        }
      };
    }
  });
