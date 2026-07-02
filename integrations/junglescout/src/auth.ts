import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Authorization header value in the format KEY_NAME:API_KEY')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      keyName: z.string().describe('The Key Name from the Jungle Scout Developer section'),
      apiKey: z
        .string()
        .describe('The API Key generated in the Jungle Scout Developer section')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: `${ctx.input.keyName}:${ctx.input.apiKey}`
        }
      };
    }
  });
