import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createRegistry = SlateTool.create(spec, {
  name: 'Create Revocation Registry',
  key: 'create_registry',
  description: `Create an on-chain revocation registry for managing credential revocation. Credentials must reference a registry at issuance time to support revocation. Use **StatusList2021Entry** for standard credentials or **DockVBAccumulator2022** for ZKP credentials.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      policyDids: z
        .array(z.string())
        .describe('Array of DIDs that control the registry (minimum 1)'),
      registryType: z
        .enum(['StatusList2021Entry', 'DockVBAccumulator2022', 'CredentialStatusList2017'])
        .default('StatusList2021Entry')
        .describe(
          'Registry type. Use StatusList2021Entry for standard credentials, DockVBAccumulator2022 for ZKP.'
        ),
      addOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, credentials can only be revoked, never unrevoked')
    })
  )
  .output(
    z.object({
      registryId: z.string().optional().describe('ID of the created registry'),
      jobId: z.string().optional().describe('Background job ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createRegistry({
      policy: ctx.input.policyDids,
      type: ctx.input.registryType,
      addOnly: ctx.input.addOnly
    });

    let registryId = result?.data?.id || result?.id;
    let jobId = result?.id;

    return {
      output: {
        registryId: registryId ? String(registryId) : undefined,
        jobId: jobId ? String(jobId) : undefined
      },
      message: `Created revocation registry${registryId ? ` **${registryId}**` : ''} of type **${ctx.input.registryType}**.`
    };
  })
  .build();
