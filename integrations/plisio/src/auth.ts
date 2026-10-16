import { SlateAuth } from 'slates';
import { z } from 'zod';
import { requireText } from './lib/response';

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
      token: z.string().describe('Plisio Secret API Key from your account API settings page')
    }),

    getOutput: async ctx => {
      requireText(ctx.input.token, 'API key');
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
