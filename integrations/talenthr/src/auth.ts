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
          'API key from TalentHR Settings > Domain > API. Read-only keys support GET tools; write tools require a full key.'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError('A TalentHR API key is required.');
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
