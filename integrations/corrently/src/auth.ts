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
        .describe('Corrently API token obtained from https://console.corrently.io/')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiToken.trim())
        throw createApiServiceError(
          'Provide a Corrently API token from https://console.corrently.io/.'
        );
      return {
        output: {
          token: ctx.input.apiToken.trim()
        }
      };
    }
  })
  .addNone();
