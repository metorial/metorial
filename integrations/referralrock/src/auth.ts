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
    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      publicKey: z.string().describe('Your Referral Rock public API key'),
      privateKey: z.string().describe('Your Referral Rock private API key')
    }),

    getOutput: async ctx => {
      if (!ctx.input.publicKey.trim() || !ctx.input.privateKey.trim()) {
        throw createApiServiceError(
          'Provide both the public and private Referral Rock API keys.'
        );
      }
      let encoded = Buffer.from(`${ctx.input.publicKey}:${ctx.input.privateKey}`).toString(
        'base64'
      );
      return {
        output: {
          token: encoded
        }
      };
    }
  });
