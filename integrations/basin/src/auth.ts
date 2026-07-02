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
    name: 'Basin API Key',
    key: 'basin_api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Basin account API key. Found under "My Account" → "Basin API" tab. Provides access to all forms, submissions, domains, and projects in your account.'
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
