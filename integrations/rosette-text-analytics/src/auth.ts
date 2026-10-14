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
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Rosette Text Analytics API key from the Developer Portal')
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      if (!token) {
        throw createApiServiceError('Enter your Analytics API key from the Developer Portal.');
      }
      return {
        output: {
          token
        }
      };
    }
  })
  .addNone();
