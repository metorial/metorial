import { SlateAuth } from 'slates';
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
      apiKey: z.string().trim().min(1).describe('Geocodio API key from the Geocodio dashboard')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
