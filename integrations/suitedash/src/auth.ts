import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      publicId: z.string(),
      secretKey: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      publicId: z
        .string()
        .describe('Your SuiteDash Public ID (found under Integrations > Secure API)'),
      secretKey: z
        .string()
        .describe('Your SuiteDash Secret Key (found under Integrations > Secure API)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          publicId: ctx.input.publicId,
          secretKey: ctx.input.secretKey
        }
      };
    }
  });
