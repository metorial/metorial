import { SlateAuth } from 'slates';
import { z } from 'zod';
import { credentials } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      companyId: z.string(),
      provisioningHash: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'Provisioning API Credentials',
    key: 'provisioning_api',

    inputSchema: z.object({
      companyId: z
        .string()
        .describe(
          'Company ID (CID / Account Number) from the Admin Console account menu; configured account, not a verified person'
        ),
      provisioningHash: z
        .string()
        .describe(
          'Enterprise API provisioning hash from Advanced > Enterprise API; not a REST API lpkey_ or AD Connector key'
        )
    }),

    getOutput: async ctx => {
      let output = credentials(ctx.input);
      return {
        output
      };
    }
  });
