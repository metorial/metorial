import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      publishableToken: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Keys',
    key: 'api_keys',
    inputSchema: z.object({
      secretKey: z
        .string()
        .describe('Logo.dev secret key (sk_...). Required for search and describe endpoints.'),
      publishableKey: z
        .string()
        .optional()
        .describe(
          'Logo.dev publishable key (pk_...). Used for generating image CDN URLs. If not provided, logo URLs will omit the token parameter.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.secretKey,
          publishableToken: ctx.input.publishableKey
        }
      };
    }
  });
