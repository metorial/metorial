import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      username: z.string().describe('Your CommCare web user email address'),
      apiKey: z.string().describe('API key generated from CommCare HQ account settings')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          username: ctx.input.username
        }
      };
    }
  });
