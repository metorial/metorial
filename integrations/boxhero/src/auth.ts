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
      apiToken: z
        .string()
        .describe('BoxHero API token generated from Settings > Integrations & API')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiToken.trim())
        throw createApiServiceError('A BoxHero API token is required.');
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    }
  });
