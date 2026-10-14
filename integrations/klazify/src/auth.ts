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
      token: z
        .string()
        .describe(
          'Your Klazify API key, found in the API section of your Klazify account dashboard'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError(
          'Provide a valid Klazify API key from your account dashboard.'
        );
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
