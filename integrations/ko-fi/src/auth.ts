import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'Verification Token',
    key: 'verification_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Verification token from your Ko-fi webhooks settings page (ko-fi.com/manage/webhooks)'
        )
    }),

    getOutput: async ctx => {
      if (!ctx.input.token.trim()) {
        throw createApiServiceError(
          'Enter the verification token from your Ko-fi webhook settings.'
        );
      }
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
