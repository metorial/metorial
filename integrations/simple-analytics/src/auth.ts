import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Simple Analytics API key (sa_api_key_...)'),
      userId: z
        .string()
        .optional()
        .describe(
          'Simple Analytics User ID (sa_user_id_...), required for Export and Admin APIs'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Simple Analytics API key starting with sa_api_key_...'),
      userId: z
        .string()
        .optional()
        .describe(
          'Your Simple Analytics User ID starting with sa_user_id_... (required for Export and Admin APIs)'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          userId: ctx.input.userId
        }
      };
    }
  });
