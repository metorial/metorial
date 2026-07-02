import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      publicKey: z.string(),
      privateKey: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'HMAC API Key',
    key: 'hmac_api_key',

    inputSchema: z.object({
      publicKey: z
        .string()
        .describe('Public API Key from the eTermin dashboard (API section)'),
      privateKey: z
        .string()
        .describe('Private API Key from the eTermin dashboard (API section)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          publicKey: ctx.input.publicKey,
          privateKey: ctx.input.privateKey
        }
      };
    }
  });
