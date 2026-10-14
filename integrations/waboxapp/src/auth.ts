import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      phoneNumber: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Your Waboxapp API token, found in your account dashboard after signup.'),
      phoneNumber: z
        .string()
        .describe(
          'Your WhatsApp account phone number with international country code, without the + prefix (e.g., 34666123456).'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('A Waboxapp API token is required.');
      }
      if (!/^\d+$/.test(ctx.input.phoneNumber)) {
        throw createApiServiceError(
          'The linked account phone number must include the country code and contain digits only, without a + prefix.'
        );
      }
      return {
        output: {
          token: ctx.input.token,
          phoneNumber: ctx.input.phoneNumber
        }
      };
    }
  });
