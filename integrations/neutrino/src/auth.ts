import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      userId: z.string(),
      token: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      userId: z.string().describe('Your Neutrino account user ID'),
      apiKey: z.string().describe('Your Neutrino API key')
    }),
    getOutput: async ctx => {
      return {
        output: {
          userId: ctx.input.userId,
          token: ctx.input.apiKey
        }
      };
    }
  });
