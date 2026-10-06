import { SlateAuth } from 'slates';
import { z } from 'zod';
import { text } from './lib/data';

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
        .describe(
          'Moosend API key. Found in More > Settings > API key in the Moosend dashboard.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: text(ctx.input.apiKey, 'Moosend API key')
        }
      };
    }
  });
