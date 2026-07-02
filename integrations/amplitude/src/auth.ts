import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      apiKey: z.string().describe('Amplitude project API Key'),
      secretKey: z.string().describe('Amplitude project Secret Key'),
      token: z.string().describe('Base64-encoded API Key:Secret Key for Basic Auth')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key + Secret Key',
    key: 'api_key_secret',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Amplitude project API Key. Found under Organization Settings > Projects.'),
      secretKey: z
        .string()
        .describe(
          'Amplitude project Secret Key. Found under Organization Settings > Projects.'
        )
    }),

    getOutput: async ctx => {
      let basicToken = btoa(`${ctx.input.apiKey}:${ctx.input.secretKey}`);
      return {
        output: {
          apiKey: ctx.input.apiKey,
          secretKey: ctx.input.secretKey,
          token: basicToken
        }
      };
    }
  });
