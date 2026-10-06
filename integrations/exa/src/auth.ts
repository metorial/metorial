import { SlateAuth } from 'slates';
import { z } from 'zod';
import { credential } from './lib/contracts';

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
      apiKey: z.string().describe('Exa API key from https://dashboard.exa.ai/api-keys')
    }),
    getOutput: async ctx => {
      credential(ctx.input.apiKey);
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
