import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export const auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    key: 'api_key',
    name: 'API Key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .min(1)
        .describe(
          'Create an API key in Sixtyfour Settings → API Keys at https://app.sixtyfour.ai.'
        )
    }),
    getOutput: async ctx => {
      const token = ctx.input.apiKey.trim();
      const balance = await new Client({ token }).get('/check-balance');
      if (typeof balance.credits !== 'number' || !Number.isFinite(balance.credits)) {
        throw createApiServiceError(
          'Sixtyfour returned an invalid credit balance while validating the API key.'
        );
      }
      return { output: { token } };
    }
  });
