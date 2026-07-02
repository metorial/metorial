import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Secret',
    key: 'api_key_secret',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Chaser API key (found in Organisation Settings > Integrations)'),
      apiSecret: z.string().describe('Chaser API secret')
    }),
    getOutput: async ctx => {
      let encoded = Buffer.from(`${ctx.input.apiKey}:${ctx.input.apiSecret}`).toString(
        'base64'
      );
      return {
        output: {
          token: encoded
        }
      };
    }
  });
