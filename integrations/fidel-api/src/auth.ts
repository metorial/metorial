import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      sdkKey: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Secret API Key',
    key: 'secret_api_key',
    inputSchema: z.object({
      sdkKey: z
        .string()
        .optional()
        .describe(
          'Optional SDK/public key (pk_test_ or pk_live_) for direct card enrollment. Use the same environment as the secret key.'
        ),
      token: z
        .string()
        .describe(
          'Your Fidel API secret key. Prefixed with sk_test_ (test mode) or sk_live_ (live mode). Found in your Fidel dashboard account page.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('A Fidel API secret key is required.');
      if (ctx.input.sdkKey !== undefined && !ctx.input.sdkKey.trim())
        throw createApiServiceError('Provide a non-empty SDK key or omit it.');
      return {
        output: {
          token: ctx.input.token,
          sdkKey: ctx.input.sdkKey
        }
      };
    }
  });
