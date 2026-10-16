import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { normalizeBaseUrl } from './lib/responses';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), baseUrl: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Borneo API bearer token from your deployment service-account authentication process.'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'HTTPS API endpoint from your Borneo deployment. Required for new connections; existing connections can use their saved URL.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError('Enter a non-empty Borneo API bearer token.');
      return {
        output: {
          token: ctx.input.apiKey,
          ...(ctx.input.baseUrl === undefined
            ? {}
            : { baseUrl: normalizeBaseUrl(ctx.input.baseUrl) })
        }
      };
    }
  });
