import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      addressVerificationToken: z.string().optional()
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
          'PostGrid Print & Mail API key (test or live), or an Address Verification key for address-only use.'
        ),
      addressVerificationApiKey: z
        .string()
        .optional()
        .describe(
          'Optional separate PostGrid Address Verification API key. Address tools use this key when supplied.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          addressVerificationToken: ctx.input.addressVerificationApiKey || undefined
        }
      };
    }
  });
