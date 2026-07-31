import { SlateAuth } from 'slates';
import { z } from 'zod';

export const itemAuthInputSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(1, 'API key cannot be empty.')
    .describe('item API key from Settings > System > API Key. Sent as the x-api-key header.')
});

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
    inputSchema: itemAuthInputSchema,
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey.trim()
        }
      };
    }
  });
