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
          'ScrapeGraphAI API key. Current API tools require a key from https://scrapegraphai.com; legacy tools require a compatible v1 key.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Provide a non-empty ScrapeGraphAI API key.', {
          reason: 'invalid_auth'
        });
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
