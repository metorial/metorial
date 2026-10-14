import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('GoSquared API key')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('GoSquared API key. Generated from Settings > Your Account > API Access.')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError(
          'Enter a GoSquared API key from your API Access settings.'
        );
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
