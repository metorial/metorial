import { SlateAuth } from 'slates';
import { z } from 'zod';
import { validateToken } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'People Data Labs API key from your dashboard at https://dashboard.peopledatalabs.com'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: validateToken(ctx.input.apiKey)
        }
      };
    }
  });
