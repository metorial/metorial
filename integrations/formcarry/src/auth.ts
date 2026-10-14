import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

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
        .min(1)
        .describe(
          'Your Formcarry team API key, found under the Integrations section of the dashboard.'
        )
    }),

    getOutput: async ctx => {
      let client = new Client({ token: ctx.input.apiKey });
      await client.authenticate();

      return {
        output: {
          token: ctx.input.apiKey.trim()
        }
      };
    }
  });
