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
          'ServerAvatar API access key. Enable API access in Account -> API Access from the ServerAvatar dashboard.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter your ServerAvatar API access key.');
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
