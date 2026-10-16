import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('BigDataCloud API key')
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
          'Your BigDataCloud API key. Obtain it from your BigDataCloud account dashboard.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError(
          'Provide your BigDataCloud API key from Account → Credentials.'
        );
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
