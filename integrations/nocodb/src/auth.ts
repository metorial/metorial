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
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'NocoDB API token from Account Settings > API Tokens. Grant the permission categories needed by your tools; tokens can expire on Cloud and licensed deployments.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('A NocoDB API token is required.');
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
