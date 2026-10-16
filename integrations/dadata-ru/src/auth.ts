import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('DaData API key'),
      secretKey: z
        .string()
        .optional()
        .describe(
          'DaData secret key, required for cleaning, company-by-email, and profile APIs'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key & Secret Key',
    key: 'api_key_secret',
    inputSchema: z.object({
      apiKey: z.string().describe('DaData API key (Token)'),
      secretKey: z
        .string()
        .describe('DaData Secret key (for cleaning, company-by-email, and profile APIs)')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim() || !ctx.input.secretKey.trim()) {
        throw createApiServiceError('Enter both the DaData API key and secret key.', {
          reason: 'dadata_missing_credentials'
        });
      }
      return {
        output: {
          token: ctx.input.apiKey,
          secretKey: ctx.input.secretKey
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key (Suggestions Only)',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('DaData API key for suggestions, lookups, and geolocation')
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Enter a DaData API key.', {
          reason: 'dadata_missing_api_key'
        });
      }
      return { output: { token: ctx.input.apiKey } };
    }
  });
