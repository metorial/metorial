import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('API Key for Cloudinary authentication'),
      apiSecret: z.string().describe('API Secret for Cloudinary authentication')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Secret',
    key: 'api_key_secret',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your Cloudinary API Key, found on the API Keys page of the Cloudinary Console Settings.'
        ),
      apiSecret: z.string().describe('Your Cloudinary API Secret. Must be kept confidential.')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          apiSecret: ctx.input.apiSecret
        }
      };
    }
  });
