import { createApiServiceError, SlateAuth } from 'slates';
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
          'Logo.dev publishable key (pk_...). Required by get_logo_url for image CDN URLs. Other API tools use the secret key.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.secretKey.trim()) {
        throw createApiServiceError('Enter a Logo.dev secret API key (sk_...).');
      }
      if (ctx.input.publishableKey !== undefined && !ctx.input.publishableKey.trim()) {
        throw createApiServiceError('Enter a publishable key (pk_...) or leave it unset.');
      }
      return {
        output: {
          token: ctx.input.secretKey,
          publishableToken: ctx.input.publishableKey
        }
      };
    }
  });
