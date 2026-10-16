import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('ClassMarker API key'),
      apiSecret: z
        .string()
        .describe('ClassMarker API secret used for SHA256 signature generation')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Secret',
    key: 'api_key_secret',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your ClassMarker API key, found under My Account > API/Webhooks'),
      apiSecret: z
        .string()
        .describe('Your ClassMarker API secret, found under My Account > API/Webhooks')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim() || !ctx.input.apiSecret.trim()) {
        throw createApiServiceError('A ClassMarker API key and API secret are required.');
      }
      return {
        output: {
          token: ctx.input.apiKey,
          apiSecret: ctx.input.apiSecret
        }
      };
    }
  });
