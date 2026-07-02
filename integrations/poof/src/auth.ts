import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Poof API key from your developer dashboard'),
      username: z
        .string()
        .optional()
        .describe('Poof username (required for checkout operations)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          username: ctx.input.username
        }
      };
    }
  });
