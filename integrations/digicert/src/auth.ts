import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('DigiCert API key for authenticating requests')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'CertCentral API Key',
    key: 'certcentral_api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'CertCentral API key generated under Automation > API Keys in the CertCentral console'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
