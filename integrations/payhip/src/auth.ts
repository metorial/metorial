import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Payhip account API key for coupon management'),
      productSecretKey: z
        .string()
        .optional()
        .describe('Product-specific secret key for license key operations')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Account API key found under Settings > Developer tab'),
      productSecretKey: z
        .string()
        .optional()
        .describe(
          'Product secret key for license key operations, found on the edit product page under license key settings'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          productSecretKey: ctx.input.productSecretKey
        }
      };
    }
  });
