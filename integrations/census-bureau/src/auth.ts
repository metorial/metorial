import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Census Bureau API key required for statistical data queries. Public metadata, geocoder, and TIGERweb tools can be used without a key.'
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
        .describe(
          'Census Bureau API key obtained from https://api.census.gov/data/key_signup.html'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  })
  .addNone();
