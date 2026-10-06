import { SlateAuth } from 'slates';
import { z } from 'zod';
import { credential, host, resourceId } from './lib/contracts';

export let auth = SlateAuth.create()
  .output(
    z.object({
      integrationKey: z.string(),
      secretKey: z.string(),
      apiHostname: z.string(),
      signingVersion: z.enum(['v2', 'v5']).optional()
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
        .describe(
          'Exact API hostname from the Duo Admin Panel, api-XXXXXXXX.duosecurity.com or the Federal duofederal.com equivalent'
        ),
      signingVersion: z
        .enum(['v2', 'v5'])
        .optional()
        .describe(
          'v5 uses current HMAC-SHA512 signing; v2 preserves legacy HMAC-SHA1 form signing'
        )
    }),

    getOutput: async ctx => {
      resourceId(ctx.input.integrationKey);
      credential(ctx.input.secretKey);
      return {
        output: {
          integrationKey: ctx.input.integrationKey,
          secretKey: ctx.input.secretKey,
          apiHostname: host(ctx.input.apiHostname),
          signingVersion: ctx.input.signingVersion ?? 'v5'
        }
      };
    }
  });
