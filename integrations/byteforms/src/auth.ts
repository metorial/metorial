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
          'Your ByteForms API key. You can find this in your ByteForms account settings.'
        )
    }),
    getOutput: async ctx => {
      let apiKey = ctx.input.apiKey.trim();
      if (!apiKey) {
        throw createApiServiceError('A ByteForms API key is required.');
      }
      return {
        output: {
          token: apiKey
        }
      };
    }
  });
