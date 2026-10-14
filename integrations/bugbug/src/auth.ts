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
          'BugBug API token found in the Integrations tab of your project in the BugBug web app'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('A BugBug project API token is required.');
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
