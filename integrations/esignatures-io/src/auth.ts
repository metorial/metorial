import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Secret Token',
    key: 'secret_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your eSignatures.io Secret Token. Found under API/Automation settings in your dashboard.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('An eSignatures.io secret token is required.');
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
