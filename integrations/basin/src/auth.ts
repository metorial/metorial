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
    name: 'Basin API Key',
    key: 'basin_api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Basin Account API Key from Account Settings → API Settings. Provides access to authorized forms, submissions, domains, and projects. REST API access requires a Growth, Pro, or Agency plan.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Provide your Basin Account API Key from API Settings.');
      }
      return {
        output: {
          token: ctx.input.token.trim()
        }
      };
    }
  });
