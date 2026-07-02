import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      botToken: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Account-level API token from app.botstar.com/account/profile'),
      botToken: z
        .string()
        .optional()
        .describe(
          'Bot-level access token from bot Settings page (required for broadcasting messages)'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          botToken: ctx.input.botToken
        }
      };
    }
  });
