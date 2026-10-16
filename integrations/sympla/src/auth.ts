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
          'Sympla API token. Generate one from the Sympla platform under My Account > Integrations.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('A Sympla API token is required.', {
          reason: 'sympla_missing_token'
        });
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
