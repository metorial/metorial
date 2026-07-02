import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      integrationKey: z.string(),
      secretKey: z.string(),
      apiHostname: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'Duo API Credentials',
    key: 'duo_credentials',

    inputSchema: z.object({
      integrationKey: z.string().describe('Integration Key (ikey) from the Duo Admin Panel'),
      secretKey: z.string().describe('Secret Key (skey) from the Duo Admin Panel'),
      apiHostname: z
        .string()
        .describe('API Hostname in the format api-XXXXXXXX.duosecurity.com')
    }),

    getOutput: async ctx => {
      return {
        output: {
          integrationKey: ctx.input.integrationKey,
          secretKey: ctx.input.secretKey,
          apiHostname: ctx.input.apiHostname.toLowerCase().replace(/^https?:\/\//, '')
        }
      };
    }
  });
