import { SlateAuth } from 'slates';
import { z } from 'zod';

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
          'Company ID (CID / Account Number) found in the LastPass Admin Console Dashboard'
        ),
      provisioningHash: z
        .string()
        .describe('Provisioning Hash generated at Admin Console > Advanced > Enterprise API')
    }),

    getOutput: async ctx => {
      return {
        output: {
          companyId: ctx.input.companyId,
          provisioningHash: ctx.input.provisioningHash
        }
      };
    }
  });
