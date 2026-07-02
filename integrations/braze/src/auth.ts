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
    name: 'REST API Key',
    key: 'rest_api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Braze REST API Key generated from the Braze dashboard under Settings > APIs and Identifiers'
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
