import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiSecret: z.string().optional(),
      accountEmail: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Icypeas API key, found in the API section of your dashboard'),
      apiSecret: z
        .string()
        .optional()
        .describe('Your Icypeas API secret, used for webhook signature verification'),
      accountEmail: z
        .string()
        .optional()
        .describe(
          'The email address associated with your Icypeas account, used for subscription queries'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          apiSecret: ctx.input.apiSecret,
          accountEmail: ctx.input.accountEmail
        }
      };
    }
  });
