import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Base64-encoded KEY_ID:KEY_SECRET for Basic Authentication')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      keyId: z
        .string()
        .describe('API Key ID from Leexi Settings > Company Settings > API Keys'),
      keySecret: z
        .string()
        .describe('API Key Secret from Leexi Settings > Company Settings > API Keys')
    }),

    getOutput: async ctx => {
      if (!ctx.input.keyId.trim() || !ctx.input.keySecret.trim()) {
        throw createApiServiceError('Enter both the Leexi API Key ID and API Key Secret.');
      }
      let encoded = Buffer.from(`${ctx.input.keyId}:${ctx.input.keySecret}`).toString(
        'base64'
      );
      return {
        output: {
          token: encoded
        }
      };
    }
  });
