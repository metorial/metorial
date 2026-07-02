import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('DaData API key'),
      secretKey: z
        .string()
        .optional()
        .describe('DaData secret key, required for cleaning and profile APIs')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key & Secret Key',
    key: 'api_key_secret',
    inputSchema: z.object({
      apiKey: z.string().describe('DaData API key (Token)'),
      secretKey: z.string().describe('DaData Secret key (for cleaning and profile APIs)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          secretKey: ctx.input.secretKey
        }
      };
    }
  });
