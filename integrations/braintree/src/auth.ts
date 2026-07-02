import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      merchantId: z.string().describe('Braintree merchant ID'),
      publicKey: z.string().describe('Braintree public key'),
      privateKey: z.string().describe('Braintree private key'),
      token: z
        .string()
        .describe('Base64-encoded authorization token derived from public and private keys')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      merchantId: z.string().describe('Your Braintree merchant ID'),
      publicKey: z.string().describe('Your Braintree public key'),
      privateKey: z.string().describe('Your Braintree private key')
    }),

    getOutput: async ctx => {
      let token = btoa(`${ctx.input.publicKey}:${ctx.input.privateKey}`);
      return {
        output: {
          merchantId: ctx.input.merchantId,
          publicKey: ctx.input.publicKey,
          privateKey: ctx.input.privateKey,
          token
        }
      };
    }
  });
