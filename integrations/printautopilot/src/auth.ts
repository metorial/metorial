import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Connection Token',
    key: 'connection_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Bearer token from your PrintAutopilot account dashboard, used for general API access such as retrieving print jobs.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
