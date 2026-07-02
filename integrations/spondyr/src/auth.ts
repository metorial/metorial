import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      applicationToken: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key & Application Token',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Your Spondyr API Key, found in the Spondyr dashboard'),
      applicationToken: z
        .string()
        .describe('Your Spondyr Application Token, found in the Spondyr dashboard')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          applicationToken: ctx.input.applicationToken
        }
      };
    }
  });
