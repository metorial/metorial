import { SlateAuth } from 'slates';
import { z } from 'zod';
import { baseUrl, credentialVariants, safeJson } from './lib/validation';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string().optional(),
      apiResource: z.enum(['workspaces', 'applications']).optional()
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
          'Budibase API key, found in the user dropdown menu in the top right corner of the Budibase portal'
        ),
      baseUrl: z
        .string()
        .describe(
          'Budibase instance Public API URL ending in /api/public/v1, for example https://budibase.app/api/public/v1.'
        ),
      apiResource: z
        .enum(['workspaces', 'applications'])
        .default('workspaces')
        .describe(
          'Use workspaces for current Budibase. Choose applications only for an older deployed instance requiring the documented legacy routes.'
        )
    }),
    getOutput: async ctx => {
      const secrets = credentialVariants(ctx.input.token);
      const origin = baseUrl(ctx.input.baseUrl);
      safeJson(origin, secrets);
      return {
        output: {
          token: ctx.input.token,
          baseUrl: origin,
          apiResource: ctx.input.apiResource
        }
      };
    }
  });
