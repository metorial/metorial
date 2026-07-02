import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSigningIdentities = SlateTool.create(spec, {
  name: 'List Signing Identities',
  key: 'list_signing_identities',
  description: `Retrieves all signing identities including iOS certificates, provisioning profiles, and Android keystores. Use **identityType** to filter by type, or omit to retrieve all types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      identityType: z
        .enum(['certificates', 'provisioning_profiles', 'keystores', 'all'])
        .default('all')
        .describe('Type of signing identity to list')
    })
  )
  .output(
    z.object({
      certificates: z.array(z.any()).optional(),
      provisioningProfiles: z.array(z.any()).optional(),
      keystores: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result: { certificates?: any[]; provisioningProfiles?: any[]; keystores?: any[] } = {};

    if (ctx.input.identityType === 'all' || ctx.input.identityType === 'certificates') {
      result.certificates = await client.listCertificates();
    }
    if (
      ctx.input.identityType === 'all' ||
      ctx.input.identityType === 'provisioning_profiles'
    ) {
      result.provisioningProfiles = await client.listProvisioningProfiles();
    }
    if (ctx.input.identityType === 'all' || ctx.input.identityType === 'keystores') {
      result.keystores = await client.listKeystores();
    }

    let total =
      (result.certificates?.length ?? 0) +
      (result.provisioningProfiles?.length ?? 0) +
      (result.keystores?.length ?? 0);

    return {
      output: result,
      message: `Found **${total}** signing identit(ies) total.`
    };
  })
  .build();
