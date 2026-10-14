import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().min(1)
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Connection Token',
    key: 'connection_token',
    inputSchema: z.object({
      token: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Connection token from your PrintAutopilot dashboard for retrieving queued documents, registering printers, and recording print results. Queue API tokens are supplied separately when submitting documents.'
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
