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
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Companies House API key. Create or manage keys at https://developer.company-information.service.gov.uk/manage-applications'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.apiKey
      }
    })
  });
