import { SlateAuth } from 'slates';
import { z } from 'zod';
import { TinifyClient } from './lib/client';
import { text } from './lib/validation';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), basicAuthorization: z.string().optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Tinify API key from your developer account')
    }),
    getOutput: async ctx => {
      const token = text(ctx.input.apiKey, 'API key');
      await new TinifyClient(token).getCompressionCount();
      return {
        output: {
          token,
          basicAuthorization: `Basic ${Buffer.from(`api:${token}`).toString('base64')}`
        }
      };
    }
  });
