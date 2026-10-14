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
          'Paradym API key (starts with paradym_). Created via the Quickstart guide in the Paradym Dashboard.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError(
          'Enter a non-empty Paradym API key from your account settings.'
        );
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
