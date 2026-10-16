import { createApiServiceError, SlateAuth } from 'slates';
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
      let keyName = ctx.input.keyName.trim();
      let apiKey = ctx.input.apiKey.trim();
      if (!keyName || !apiKey || /[\r\n]/.test(keyName + apiKey)) {
        throw createApiServiceError('Enter a valid Jungle Scout key name and API key.', {
          reason: 'invalid_input'
        });
      }
      return {
        output: {
          token: `${keyName}:${apiKey}`
        }
      };
    }
  });
